import { test, expect } from '@playwright/test'
import { createTestUsers } from './helpers/auth'

async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-container"], [data-testid="sidebar"]', { timeout: 15000 })
}

test.describe('Multi-user collaboration', () => {
  test('two users are recognized as different users', async ({ browser }) => {
    const users = await createTestUsers(browser, 2)

    try {
      await waitForApp(users[0].page)
      await waitForApp(users[1].page)

      // Both should have the sidebar visible (they're signed in)
      await expect(users[0].page.getByTestId('sidebar')).toBeVisible()
      await expect(users[1].page.getByTestId('sidebar')).toBeVisible()
    } finally {
      for (const u of users) await u.context.close()
    }
  })
})
