import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Wait for the React app to mount. The task manager shows either:
 * - "Loading..." while auth initializes
 * - The sidebar once ready (even for anonymous users)
 */
async function waitForApp(page: import('@playwright/test').Page) {
  // Wait for either the task manager container or the auth loading to resolve
  await page.waitForSelector('[data-testid="app-container"], [data-testid="sidebar"]', { timeout: 15000 })
}

test.describe('Smoke tests', () => {
  test('app loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForApp(page)
    expect(errors).toEqual([])
  })

  test('navigation is visible', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('sign-in button visible when logged out', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('read-only-sign-in-button')).toBeVisible()
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    // 404 page doesn't need the task manager to load
    await expect(page.locator('text=404')).toBeVisible({ timeout: 15000 })
  })
})
