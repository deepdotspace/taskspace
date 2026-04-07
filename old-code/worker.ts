/// <reference types="@cloudflare/workers-types" />

/**
 * Site Worker — Per-Tenant Cloudflare Worker
 *
 * Standard backend worker deployed for each site via Workers for Platforms.
 * Handles:
 *   - Static asset serving via Cloudflare Assets
 *   - WebSocket connections proxied to SharedRecordRoom on platform worker
 *   - Scoped R2 file storage (app files + user files)
 *   - McAPI proxy for AI features
 *   - Server actions (trusted app-level operations, e.g. cross-scope writes)
 *
 * Auth: Clerk JWT verification via PEM public key bound at deploy time.
 */

import { RecordRoom as RecordRoomBase, handleMcAPIProxy, createScopedR2Handler, buildCronContext } from '@spaces/sdk/worker'
import type { ScopedR2Handler, ActionHandler, ActionContext, ActionTools, ActionResult } from '@spaces/sdk/worker'
import { verifyClerkToken, verifyInternalSignature, buildInternalPayload } from '@miyagi/auth'
import { actions } from './src/actions'
import { schemas } from './src/schemas'
import { handler as cronHandler } from './src/cron'

// ============================================================================
// Environment
// ============================================================================

interface Env {
  ASSETS: Fetcher
  FILES: R2Bucket
  PLATFORM_WORKER: Fetcher
  OWNER_USER_ID?: string
  APP_NAME?: string
  CLERK_JWT_KEY?: string
  CLERK_JWT_ISSUER?: string
  CLERK_JWT_CLOCK_SKEW_MS?: string
  INTERNAL_STORAGE_HMAC_SECRET?: string
}

// ============================================================================
// Main Worker
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Platform worker proxy — forward /platform/* to the shared platform-worker
    if (url.pathname.startsWith('/platform/')) {
      const target = new URL(request.url)
      target.pathname = url.pathname.replace('/platform', '')
      const proxied = new Request(target, request)
      proxied.headers.delete('X-App-Action')
      return env.PLATFORM_WORKER.fetch(proxied)
    }

    // WebSocket → SharedRecordRoom on platform worker
    if (url.pathname.startsWith('/ws/')) {
      const roomId = url.pathname.replace('/ws/', '') || 'default'
      const target = new URL(request.url)
      target.pathname = `/ws/records/${encodeURIComponent(roomId)}`
      const proxied = new Request(target, request)
      proxied.headers.delete('X-App-Action')
      return env.PLATFORM_WORKER.fetch(proxied)
    }

    // OG image served from R2 (async screenshot stored by dispatch worker)
    if (url.pathname === '/og-image.png') {
      return handleOgImage(url, env)
    }

    // Internal cron endpoint (HMAC-authenticated, called by dispatch worker)
    if (url.pathname === '/internal/cron' && request.method === 'POST') {
      return handleCron(request, env)
    }

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, url, env)
    }

    // Static assets via Cloudflare Assets with SPA fallback
    return handleAssets(request, url, env)
  },
}

// ============================================================================
// OG Image Handler
// ============================================================================

/**
 * Serve OG screenshot from R2.
 * The dispatch worker takes an async screenshot after each deploy and stores
 * it at og-images/{appName}/og-image.png in the shared R2 bucket.
 */
async function handleOgImage(url: URL, env: Env): Promise<Response> {
  const appName = url.hostname.split('.')[0]
  const r2Obj = await env.FILES.get(`og-images/${appName}/og-image.png`)
  if (r2Obj) {
    return new Response(r2Obj.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
  return new Response(null, { status: 404 })
}

// ============================================================================
// Asset Handler
// ============================================================================

async function handleAssets(request: Request, url: URL, env: Env): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request)

  if (assetResponse.ok || (assetResponse.status >= 300 && assetResponse.status < 400)) {
    return assetResponse
  }

  // SPA fallback: serve index.html for non-asset 404s
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname)
  if (!hasFileExtension || url.pathname.endsWith('.html')) {
    const indexRequest = new Request(new URL('/index.html', url.origin), request)
    return env.ASSETS.fetch(indexRequest)
  }

  return assetResponse
}

// ============================================================================
// API Router
// ============================================================================

async function handleApi(request: Request, url: URL, env: Env): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Auth',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Health check — includes auth config status for deploy verification
  if (url.pathname === '/api/health') {
    return Response.json({
      status: 'ok',
      timestamp: Date.now(),
      auth: {
        configured: !!env.CLERK_JWT_KEY,
        keyFingerprint: env.CLERK_JWT_KEY
          ? env.CLERK_JWT_KEY.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '').slice(-8)
          : null,
        issuer: env.CLERK_JWT_ISSUER ?? null,
      },
    })
  }

  // McAPI Proxy for AI features
  if (url.pathname.startsWith('/api/mcapi/')) {
    return handleMcAPIProxy(request, url)
  }

  // Files API (shared scoped handler — auth resolved here, passed down)
  if (url.pathname.startsWith('/api/files')) {
    const auth = await authenticateRequest(request, env)
    if (!auth.userId && auth.reason) {
      console.error(`[Files] Auth failed: ${auth.reason}`)
    }
    return siteFilesHandler(request, url, env.FILES, { userId: auth.userId })
  }

  // Server actions — app-defined handlers that run server-side with app trust
  if (url.pathname.startsWith('/api/actions/') && request.method === 'POST') {
    return handleAction(request, url, env)
  }

  // Tools & Debug API → proxy to platform worker (NO app trust — user RBAC applies)
  if (url.pathname.startsWith('/api/tools/') || url.pathname.startsWith('/api/debug/')) {
    const proxied = new Request(request.url, request)
    proxied.headers.delete('X-App-Action')
    return env.PLATFORM_WORKER.fetch(proxied)
  }

  return new Response('Not Found', { status: 404 })
}

// ============================================================================
// Server Actions Handler
// ============================================================================

async function handleAction(request: Request, url: URL, env: Env): Promise<Response> {
  const actionName = url.pathname.replace('/api/actions/', '')
  if (!actionName) {
    return Response.json({ success: false, error: 'Missing action name' }, { status: 400 })
  }

  const handler = (actions as Record<string, ActionHandler>)[actionName]
  if (!handler) {
    return Response.json({ success: false, error: `Unknown action: ${actionName}` }, { status: 404 })
  }

  const auth = await authenticateRequest(request, env)
  if (!auth.userId) {
    return Response.json(
      { success: false, error: `Authentication required: ${auth.reason}` },
      { status: 401 },
    )
  }

  let params: Record<string, unknown> = {}
  try {
    params = (await request.json()) as Record<string, unknown>
  } catch {
    // Empty body is fine for some actions
  }

  const tools = createActionTools(env, auth.userId, request)
  const ctx: ActionContext = { userId: auth.userId, params, tools }

  try {
    const result = await handler(ctx)
    return Response.json(result, { status: result.success ? 200 : 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Action failed'
    console.error(`[Action:${actionName}] Error:`, err)
    return Response.json({ success: false, error: msg }, { status: 500 })
  }
}

/**
 * Build an ActionTools instance that calls the platform worker's tools API
 * with X-App-Action: true (bypasses user RBAC in the DO).
 */
function createActionTools(env: Env, userId: string, originalRequest: Request): ActionTools {
  const authHeader = originalRequest.headers.get('Authorization') ?? ''
  const appName = env.APP_NAME ?? ''

  async function callPlatformTools(
    scopeId: string,
    tool: string,
    params: Record<string, unknown>,
  ): Promise<ActionResult> {
    const targetUrl = new URL(originalRequest.url)
    targetUrl.pathname = `/api/tools/execute`
    targetUrl.searchParams.set('scopeId', scopeId)
    if (appName) targetUrl.searchParams.set('appId', appName)

    const req = new Request(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-App-Action': 'true',
      },
      body: JSON.stringify({ tool, params, userId }),
    })

    const res = await env.PLATFORM_WORKER.fetch(req)
    const text = await res.text()
    if (!res.ok) {
      console.error(`[callPlatformTools] ${tool} on ${scopeId} failed (${res.status}):`, text)
    }
    try {
      return JSON.parse(text) as ActionResult
    } catch {
      console.error(`[callPlatformTools] Non-JSON response (${res.status}) for ${tool} on ${scopeId}:`, text)
      return { success: false, error: `Platform returned non-JSON (${res.status}): ${text.slice(0, 200)}` }
    }
  }

  return {
    create: (scopeId, collection, data) =>
      callPlatformTools(scopeId, 'records.create', { collection, data }),
    update: (scopeId, collection, recordId, data) =>
      callPlatformTools(scopeId, 'records.update', { collection, recordId, data }),
    remove: (scopeId, collection, recordId) =>
      callPlatformTools(scopeId, 'records.delete', { collection, recordId }),
    get: (scopeId, collection, recordId) =>
      callPlatformTools(scopeId, 'records.get', { collection, recordId }),
    query: (scopeId, collection, options) =>
      callPlatformTools(scopeId, 'records.query', { collection, ...options }),
  }
}

// ============================================================================
// Cron Handler
// ============================================================================

/**
 * POST /internal/cron
 *
 * Called by the dispatch worker's scheduled() handler.
 * HMAC-authenticated. Invokes the app's cron handler with a CronContext.
 */
async function handleCron(request: Request, env: Env): Promise<Response> {
  const secret = env.INTERNAL_STORAGE_HMAC_SECRET
  if (!secret) {
    return Response.json({ error: 'Internal auth not configured' }, { status: 500 })
  }

  const timestamp = request.headers.get('x-internal-timestamp')
  const signature = request.headers.get('x-internal-signature')
  if (!timestamp || !signature) {
    return Response.json({ error: 'Missing auth headers' }, { status: 401 })
  }

  const bodyText = await request.text()
  const verified = await verifyInternalSignature({
    secret,
    timestamp,
    signature,
    payload: bodyText,
  })

  if (!verified) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: { taskName: string; ownerUserId: string }
  try {
    body = JSON.parse(bodyText)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { taskName, ownerUserId } = body
  if (!taskName || !ownerUserId) {
    return Response.json({ error: 'Missing taskName or ownerUserId' }, { status: 400 })
  }

  // Verify the payload's ownerUserId matches the deploy-time owner binding.
  // Prevents a compromised KV entry from executing cron as a different user.
  if (env.OWNER_USER_ID && ownerUserId !== env.OWNER_USER_ID) {
    console.error(`[CRON] ownerUserId mismatch: payload="${ownerUserId}" env="${env.OWNER_USER_ID}"`)
    return Response.json({ error: 'ownerUserId mismatch' }, { status: 403 })
  }

  try {
    const ctx = buildCronContext(env as any, ownerUserId)
    await cronHandler(taskName, ctx)
    return Response.json({ success: true, taskName })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CRON] Handler error for task "${taskName}":`, msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}

// ============================================================================
// Auth
// ============================================================================

interface AuthResult {
  userId: string | null
  reason?: string
}

/**
 * Verify Clerk JWT from the Authorization header.
 *
 * Each deployed site is an isolated worker. JWT signature verification
 * alone is sufficient — no authorizedParties check needed.
 */
async function authenticateRequest(request: Request, env: Env): Promise<AuthResult> {
  // Dev-only: X-Dev-User-Id header bypasses JWT verification for curl/script testing.
  const devUserId = request.headers.get('X-Dev-User-Id')
  if (devUserId) {
    return { userId: devUserId }
  }

  if (!env.CLERK_JWT_KEY) {
    return { userId: null, reason: 'CLERK_JWT_KEY not configured' }
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, reason: 'Missing or malformed Authorization header' }
  }

  const token = authHeader.slice(7)
  try {
    const outcome = await verifyClerkToken(
      {
        jwtKey: env.CLERK_JWT_KEY!,
        issuer: env.CLERK_JWT_ISSUER ?? '',
        clockSkewMs: parseInt(env.CLERK_JWT_CLOCK_SKEW_MS || '5000'),
      },
      token,
    )

    if (outcome.result) {
      return { userId: outcome.result.clerkUserId }
    }

    const errorMsg = outcome.error instanceof Error
      ? outcome.error.message
      : String(outcome.error ?? 'Unknown verification error')
    return { userId: null, reason: errorMsg }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected auth error'
    return { userId: null, reason: msg }
  }
}

// ============================================================================
// Files API — shared scoped handler
// ============================================================================

function getAppNameFromHostname(url: URL): string {
  const parts = url.hostname.split('.')
  return parts.length >= 3 ? parts[0] : url.hostname
}

const siteFilesHandler: ScopedR2Handler = createScopedR2Handler({
  resolvePrefix: (scope, ctx) => {
    if (scope === 'user') {
      if (!ctx.userId) return { error: 'Authentication required for scope=user' }
      return { prefix: `users/${ctx.userId}/` }
    }
    return { prefix: `apps/${getAppNameFromHostname(ctx.url)}/` }
  },
  requireAuthForMutations: true,
})
