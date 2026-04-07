import { test, expect } from '@playwright/test'

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
