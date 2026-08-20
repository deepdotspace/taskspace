import { test, expect } from '@playwright/test'
import { signUp, enterWorkspace } from './helpers/auth'
import { ACCOUNT_A } from './helpers/accounts'

// Temporary regression check for the ChatPanel auto-create path: the UI must
// send a real chatId (resolved from the create response's `recordId`) on the
// streaming turn. Intercepts POST /api/ai/chat so no LLM call is made.
test('ChatPanel sends a resolved chatId on the streaming turn', async ({ page }) => {
  await signUp(page, ACCOUNT_A.email, { password: ACCOUNT_A.password, name: ACCOUNT_A.name })
  await enterWorkspace(page)

  let capturedBody: Record<string, unknown> | null = null
  await page.route('**/api/ai/chat', async (route) => {
    capturedBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'X-Asst-Id': 'asst-test' },
      body: 'data: [DONE]\n\n',
    })
  })

  // Open the assistant dock and send a message through the real UI path.
  await page.locator('button[title="AI Assistant"]').click()
  const input = page.getByPlaceholder('Message the assistant…')
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill('hello')
  await input.press('Enter')

  await expect.poll(() => capturedBody, { timeout: 15000 }).not.toBeNull()
  const body = capturedBody as unknown as Record<string, unknown>
  expect(typeof body.chatId).toBe('string')
  expect((body.chatId as string).length).toBeGreaterThan(0)
})
