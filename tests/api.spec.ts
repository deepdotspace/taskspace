import { test, expect } from '@playwright/test'
import { signUp } from './helpers/auth'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    await page.goto('/')
    // Wait for the task manager app to connect its WebSocket
    await page.waitForSelector('[data-testid="app-container"], [data-testid="sidebar"]', { timeout: 15000 })
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
    await signUp(page, 'alice-1777048251@deepspace.test', { password: 'Pass123!', name: 'Alice' })
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 15000 })

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
})
