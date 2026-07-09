/**
 * App Worker — Hono-based Cloudflare Worker for DeepSpace apps.
 *
 * Each app owns its RecordRoom DOs. Schemas are baked in at deploy time.
 *
 * Handles:
 *   - WebSocket → app's own RecordRoom DO (real-time data)
 *   - Auth proxy → auth-worker (same-origin cookies)
 *   - Server actions (app-defined, bypass user RBAC)
 *   - Scoped R2 file storage
 *   - Static asset serving with SPA fallback
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { verifyJwt } from 'deepspace/worker'
import type { JwtVerifierConfig, VerifyResult } from 'deepspace/worker'
import {
  RecordRoom,
  YjsRoom,
  CanvasRoom,
  PresenceRoom,
  MSG,
  createScopedR2Handler,
  type ScopedR2Handler,
} from 'deepspace/worker'
import type {
  ActionTools,
  ActionResult,
  GetActionData,
  QueryActionData,
  MutateActionData,
  DOManifest,
  DOBindings,
  UserAttachment,
} from 'deepspace/worker'
import { actions } from './src/actions/index.js'
import { schemas } from './src/schemas.js'
import { registerAiChatRoutes } from './src/ai/chat-routes.js'

// =============================================================================
// DO Manifest — declares all Durable Objects for dynamic deploy bindings
// =============================================================================

export const __DO_MANIFEST__ = [
  { binding: 'RECORD_ROOMS', className: 'AppRecordRoom', sqlite: true },
  { binding: 'YJS_ROOMS', className: 'AppYjsRoom', sqlite: true },
  { binding: 'CANVAS_ROOMS', className: 'AppCanvasRoom', sqlite: true },
  { binding: 'PRESENCE_ROOMS', className: 'AppPresenceRoom', sqlite: true },
] as const satisfies DOManifest

// =============================================================================
// Durable Objects — extend to customize behavior
// =============================================================================

export class AppRecordRoom extends RecordRoom {
  /**
   * The roomId derived from the request URL. Used by `onMessage` to detect
   * whether the room is the app-level scope (`app:*`) — in which case the
   * default `user.list` broadcast is replaced with a filtered version that
   * only exposes users sharing at least one team with the caller.
   *
   * Team scopes (`team:*`) and other rooms fall through to the default
   * behavior (everyone in that room is already a teammate, so no leak).
   */
  private cachedRoomId: string | null = null

  constructor(state: DurableObjectState, env: Env) {
    super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
  }

  override async fetch(request: Request): Promise<Response> {
    if (!this.cachedRoomId) {
      const url = new URL(request.url)
      const parts = url.pathname.split('/').filter(Boolean)
      this.cachedRoomId = parts[parts.length - 1] || null
    }
    return super.fetch(request)
  }

  protected override async onMessage(
    ws: WebSocket,
    user: UserAttachment,
    msg: { type: string; [key: string]: unknown },
  ): Promise<void> {
    // Intercept user.list only in the app-level room.
    if (msg?.type === MSG.USER_LIST && this.cachedRoomId?.startsWith('app:')) {
      const handled = await this.tryFilteredUserList(ws, user.userId)
      if (handled) return
      // Fall through to default behavior on failure
    }
    return super.onMessage(ws, user, msg)
  }

  /**
   * Send a `user.list` containing only:
   *   - the caller themselves
   *   - users who share at least one team with the caller (active members)
   *
   * Returns false if the team_members table doesn't exist yet (DO not
   * initialized) so the caller can fall back to the default behavior.
   */
  private async tryFilteredUserList(ws: WebSocket, callerId: string): Promise<boolean> {
    try {
      const tableExists = this.sql
        .exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='c_team_members'`)
        .toArray()
      if (tableExists.length === 0) return false

      // Caller's team IDs
      const teamRows = this.sql
        .exec<{ col_teamid: string }>(
          `SELECT DISTINCT col_teamid FROM c_team_members
           WHERE col_userid = ?
             AND (col_status = 'active' OR col_status IS NULL OR col_status = '')`,
          callerId,
        )
        .toArray()
      const teamIds = teamRows.map((r) => r.col_teamid).filter(Boolean)

      // Visible userIds: caller + active members of caller's teams
      const visibleIds = new Set<string>([callerId])
      if (teamIds.length > 0) {
        const placeholders = teamIds.map(() => '?').join(',')
        const userRows = this.sql
          .exec<{ col_userid: string }>(
            `SELECT DISTINCT col_userid FROM c_team_members
             WHERE col_teamid IN (${placeholders})
               AND col_userid IS NOT NULL AND col_userid != ''
               AND (col_status = 'active' OR col_status IS NULL OR col_status = '')`,
            ...teamIds,
          )
          .toArray()
        for (const row of userRows) visibleIds.add(row.col_userid)
      }

      // Hydrate from c_users
      const idArr = Array.from(visibleIds)
      const placeholders = idArr.map(() => '?').join(',')
      const userRecords = this.sql
        .exec<{
          _row_id: string
          _created_at: string
          _updated_at: string
          col_email?: string
          col_name?: string
          col_imageurl?: string | null
          col_role?: string
          col_createdat?: string
          col_lastseenat?: string
        }>(
          `SELECT _row_id, _created_at, _updated_at,
                  col_email, col_name, col_imageurl, col_role, col_createdat, col_lastseenat
           FROM c_users WHERE _row_id IN (${placeholders})`,
          ...idArr,
        )
        .toArray()

      const users = userRecords.map((r) => ({
        id: r._row_id,
        email: r.col_email || '',
        name: r.col_name || '',
        imageUrl: r.col_imageurl ?? undefined,
        role: r.col_role || 'viewer',
        createdAt: r.col_createdat || r._created_at,
        lastSeenAt: r.col_lastseenat || r._updated_at,
      }))

      ws.send(JSON.stringify({ type: MSG.USER_LIST, payload: { users } }))
      return true
    } catch (err) {
      console.error('[AppRecordRoom] filtered user.list failed:', err)
      return false
    }
  }
}

export class AppYjsRoom extends YjsRoom {}
export class AppCanvasRoom extends CanvasRoom {}
export class AppPresenceRoom extends PresenceRoom {}

// =============================================================================
// Types
// =============================================================================

export interface Env extends DOBindings<typeof __DO_MANIFEST__> {
  ASSETS: Fetcher
  FILES: R2Bucket
  API_WORKER?: Fetcher
  AUTH_JWT_PUBLIC_KEY: string
  AUTH_JWT_ISSUER: string
  AUTH_WORKER_URL: string
  API_WORKER_URL?: string
  APP_NAME: string
  OWNER_USER_ID: string
  APP_OWNER_JWT: string
}

export type AppContext = { Bindings: Env }

// =============================================================================
// App
// =============================================================================

const app = new Hono<AppContext>()
app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function jwtConfig(env: Env): JwtVerifierConfig {
  return { publicKey: env.AUTH_JWT_PUBLIC_KEY, issuer: env.AUTH_JWT_ISSUER }
}

async function resolveAuth(req: Request, env: Env): Promise<VerifyResult | null> {
  const header = req.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  return (await verifyJwt(jwtConfig(env), token)).result
}

// ---------------------------------------------------------------------------
// Social OAuth redirect + code exchange
// ---------------------------------------------------------------------------

/** Redirect to auth worker for social sign-in */
app.get('/api/auth/social-redirect', (c) => {
  const provider = c.req.query('provider')
  if (!provider) return c.json({ error: 'Missing provider' }, 400)

  const appOrigin = new URL(c.req.url).origin
  const authOrigin = new URL(c.env.AUTH_WORKER_URL).origin

  return c.redirect(
    `${authOrigin}/login/social?provider=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(appOrigin)}`,
  )
})

/** OAuth complete — exchange one-time code for session, redirect to app */
app.get('/api/auth/oauth-complete', async (c) => {
  const code = c.req.query('code')
  const appOrigin = new URL(c.req.url).origin

  if (!code) {
    return c.redirect(appOrigin)
  }

  // Exchange code for session token
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/api/auth/exchange-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    return c.redirect(appOrigin)
  }

  const { sessionToken } = (await res.json()) as { sessionToken: string }

  return new Response(null, {
    status: 302,
    headers: {
      Location: appOrigin,
      'Set-Cookie': `__Secure-better-auth.session_token=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    },
  })
})

// ---------------------------------------------------------------------------
// Auth proxy → auth-worker (same-origin cookies)
// ---------------------------------------------------------------------------

app.all('/api/auth/*', async (c) => {
  const url = new URL(c.req.url)
  const authUrl = new URL(url.pathname + url.search, c.env.AUTH_WORKER_URL)
  const res = await fetch(authUrl.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
  })
  const headers = new Headers(res.headers)
  const setCookie = headers.get('set-cookie')
  if (setCookie) {
    headers.set('set-cookie', setCookie.replace(/;\s*Domain=[^;]*/gi, ''))
  }
  return new Response(res.body, { status: res.status, headers })
})

// ---------------------------------------------------------------------------
// AI chat routes
// ---------------------------------------------------------------------------

registerAiChatRoutes(app, resolveAuth)

// ---------------------------------------------------------------------------
// Integrations proxy → api-worker (OpenAI, search, etc.)
// ---------------------------------------------------------------------------

app.post('/api/integrations/:name/:endpoint', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)

  const target = `/api/integrations/${c.req.param('name')}/${c.req.param('endpoint')}`

  // Service binding (deployed) or HTTP fallback (local dev)
  const fetcher = c.env.API_WORKER ?? null
  const url = fetcher
    ? `https://api-worker${target}`
    : `${c.env.API_WORKER_URL}${target}`

  const res = await (fetcher ?? globalThis).fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${c.req.header('Authorization')?.slice(7) ?? ''}`,
    },
    body: c.req.raw.body,
  })

  return new Response(res.body, { status: res.status, headers: res.headers })
})

// ---------------------------------------------------------------------------
// WebSocket auth helper
// ---------------------------------------------------------------------------

async function resolveWsAuth(req: Request, env: Env): Promise<VerifyResult | null> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return null
  return (await verifyJwt(jwtConfig(env), token)).result
}

function wsRoute(
  doNamespace: (env: Env) => DurableObjectNamespace,
  extraParams?: (auth: VerifyResult) => Record<string, string>,
) {
  return async (c: any) => {
    const id = c.req.param('roomId') ?? c.req.param('docId') ?? c.req.param('scopeId')
    const auth = await resolveWsAuth(c.req.raw, c.env)
    console.log(`[ws] ${id} (user: ${auth?.userId ?? 'anon'})`)

    const doUrl = new URL(c.req.url)
    if (auth) {
      doUrl.searchParams.set('userId', auth.userId)
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams(auth))) {
          doUrl.searchParams.set(k, v)
        }
      }
    }
    doUrl.searchParams.delete('token')

    const ns = doNamespace(c.env)
    const stub = ns.get(ns.idFromName(id))
    return stub.fetch(new Request(doUrl.toString(), c.req.raw))
  }
}

// ---------------------------------------------------------------------------
// WebSocket routes
// ---------------------------------------------------------------------------

app.get('/ws/:roomId', wsRoute((env) => env.RECORD_ROOMS))

app.get('/ws/yjs/:docId', wsRoute((env) => env.YJS_ROOMS, () => ({ role: 'member' })))

app.get('/ws/canvas/:docId', wsRoute((env) => env.CANVAS_ROOMS, () => ({ role: 'member' })))

app.get('/ws/presence/:scopeId', wsRoute(
  (env) => env.PRESENCE_ROOMS,
  (auth) => ({
    ...(auth.claims.name ? { userName: auth.claims.name } : {}),
    ...(auth.claims.email ? { userEmail: auth.claims.email } : {}),
    ...(auth.claims.image ? { userImageUrl: auth.claims.image } : {}),
  }),
))

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

app.post('/api/actions/:name', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  const name = c.req.param('name')
  const action = actions[name]
  if (!action) return c.json({ error: 'Action not found' }, 404)
  const params = await c.req.json<Record<string, unknown>>()
  const callerJwt = c.req.header('Authorization')!.slice(7)
  const tools = createActionTools(c.env, auth.userId, callerJwt)
  const result = await action({ userId: auth.userId, params, tools, env: c.env as unknown as Record<string, unknown>, callerJwt })
  return c.json(result as unknown as Record<string, unknown>)
})

// ---------------------------------------------------------------------------
// Scoped R2 files
// ---------------------------------------------------------------------------

const r2Handlers: Record<string, ScopedR2Handler> = {}

function getR2Handler(env: Env): ScopedR2Handler {
  if (!r2Handlers[env.APP_NAME]) {
    r2Handlers[env.APP_NAME] = createScopedR2Handler({
      resolvePrefix(scope, ctx) {
        if (scope === 'app') return { prefix: `apps/${env.APP_NAME}/` }
        if (!ctx.userId) return { error: 'Authentication required for user files' }
        return { prefix: `apps/${env.APP_NAME}/users/${ctx.userId}/` }
      },
    })
  }
  return r2Handlers[env.APP_NAME]
}

app.all('/api/files/*', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  return getR2Handler(c.env)(c.req.raw, new URL(c.req.url), c.env.FILES, { userId: auth?.userId ?? null })
})

// ---------------------------------------------------------------------------
// Static assets (SPA fallback)
// ---------------------------------------------------------------------------

app.get('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw)
  if (response.status === 404) {
    const url = new URL(c.req.url)
    url.pathname = '/index.html'
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw))
  }
  return response
})

// =============================================================================
// Action Tools — route to app's own RecordRoom DO
// =============================================================================

function createActionTools(env: Env, userId: string, callerJwt: string): ActionTools {
  const stub = env.RECORD_ROOMS.get(env.RECORD_ROOMS.idFromName(`app:${env.APP_NAME}`))

  async function execTool<T>(tool: string, params: Record<string, unknown>): Promise<ActionResult<T>> {
    const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-App-Action': 'true',
      },
      body: JSON.stringify({ tool, params }),
    }))
    return res.json() as Promise<ActionResult<T>>
  }

  async function callIntegration<T = unknown>(endpoint: string, data?: unknown): Promise<ActionResult<T>> {
    const targetUrl = env.API_WORKER
      ? `https://api-worker.internal/api/integrations/${endpoint}`
      : `${env.API_WORKER_URL ?? ''}/api/integrations/${endpoint}`
    const res = await (env.API_WORKER ?? globalThis).fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerJwt}`,
      },
      body: data != null ? JSON.stringify(data) : undefined,
    })
    return res.json() as Promise<ActionResult<T>>
  }

  return {
    create: (collection, data, recordId) =>
      execTool<MutateActionData>('records.create', {
        collection,
        data,
        ...(recordId !== undefined ? { recordId } : {}),
      }),
    update: (collection, recordId, data) =>
      execTool<MutateActionData>('records.update', { collection, recordId, data }),
    remove: (collection, recordId) =>
      execTool<MutateActionData>('records.delete', { collection, recordId }),
    get: <T extends Record<string, unknown> = Record<string, unknown>>(collection: string, recordId: string) =>
      execTool<GetActionData<T>>('records.get', { collection, recordId }),
    query: <T extends Record<string, unknown> = Record<string, unknown>>(
      collection: string,
      options?: { where?: Record<string, unknown>; orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number },
    ) => execTool<QueryActionData<T>>('records.query', { collection, ...options }),
    integration: callIntegration,
    registerUser: (opts) =>
      execTool<{
        user: { id: string; name: string; email: string; imageUrl?: string; role: string }
      }>('users.register', { ...opts }),
  }
}

export default app
