import { test, expect } from '@playwright/test'
import { signUp, enterWorkspace } from './helpers/auth'
import { ACCOUNT_A } from './helpers/accounts'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    // The workspace requires sign-in + a team; once app-container renders,
    // the app has connected its RecordRoom WebSocket.
    await signUp(page, ACCOUNT_A.email, { password: ACCOUNT_A.password, name: ACCOUNT_A.name })
    await enterWorkspace(page)
  })
})

test.describe('AI chat API', () => {
  test('POST /api/ai/chats requires auth', async ({ request }) => {
    const res = await request.post('/api/ai/chats', { data: {} })
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai/chat requires auth', async ({ request }) => {
    const res = await request.post('/api/ai/chat', {
      data: { chatId: 'test', userMessageId: 'msg1', content: 'hello' },
    })
    expect(res.status()).toBe(401)
  })

  test('authenticated user can create and use a chat', async ({ page }) => {
    await signUp(page, ACCOUNT_A.email, { password: ACCOUNT_A.password, name: ACCOUNT_A.name })
    await enterWorkspace(page)

    const result = await page.evaluate(async () => {
      // Exchange session cookie for a Bearer JWT (same flow as the app)
      const tokenRes = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!tokenRes.ok) return { error: `token failed: ${tokenRes.status}` }
      const { token } = await tokenRes.json() as { token: string }
      const authHeader = { Authorization: `Bearer ${token}` }

      // Create a chat
      const createRes = await fetch('/api/ai/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({}),
      })
      if (!createRes.ok) return { error: `create failed: ${createRes.status}` }
      const { chat } = await createRes.json() as { chat: { id: string } }

      // Patch (rename) the chat
      const patchRes = await fetch(`/api/ai/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ title: 'My test chat' }),
      })
      if (!patchRes.ok) return { error: `patch failed: ${patchRes.status}` }

      // Delete the chat
      const deleteRes = await fetch(`/api/ai/chats/${chat.id}`, {
        method: 'DELETE',
        headers: { ...authHeader },
      })
      if (!deleteRes.ok) return { error: `delete failed: ${deleteRes.status}` }

      return { ok: true }
    })

    expect(result).toEqual({ ok: true })
  })

  // The assistant's data tools are scoped to the caller's active team room,
  // so /api/ai/chat must reject turns without a teamId (400) or with a team
  // the caller isn't an active member of (403). All three requests below
  // fail validation before any model call, so this stays cheap and
  // deterministic.
  test('AI chat turn validates team membership before streaming', async ({ page }) => {
    await signUp(page, ACCOUNT_A.email, { password: ACCOUNT_A.password, name: ACCOUNT_A.name })
    await enterWorkspace(page)

    const result = await page.evaluate(async () => {
      const tokenRes = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!tokenRes.ok) return { error: `token failed: ${tokenRes.status}` }
      const { token } = await tokenRes.json() as { token: string }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      const teamId = localStorage.getItem('taskspace_activeTeamId')
      const turn = (body: Record<string, unknown>) =>
        fetch('/api/ai/chat', { method: 'POST', headers, body: JSON.stringify(body) })

      const base = { chatId: 'chat-x', userMessageId: 'msg-1', content: 'hello' }
      const noTeam = await turn(base)
      const notMember = await turn({ ...base, teamId: 'team-the-caller-is-not-in' })
      // Membership passes → proceeds to the chat lookup, which 404s.
      const unknownChat = await turn({ ...base, teamId })

      return {
        hasTeam: !!teamId,
        noTeam: noTeam.status,
        notMember: notMember.status,
        unknownChat: unknownChat.status,
      }
    })

    expect(result).toEqual({ hasTeam: true, noTeam: 400, notMember: 403, unknownChat: 404 })
  })
})
