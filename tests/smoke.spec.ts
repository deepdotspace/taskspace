import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

test.describe('Smoke tests', () => {
  test('landing page renders for signed-out visitors without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /The calm task manager/ })).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('landing has primary CTA and required footer links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Get started free' }).first()).toBeVisible({ timeout: 15000 })
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Contact' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Follow on X' })).toBeVisible()
    await expect(footer.getByText(/© DeepSpace \d{4}/)).toBeVisible()
  })

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible({ timeout: 15000 })
  })

  test('signed-out visitor hitting the app is asked to sign in', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByText('Sign in to DeepSpace')).toBeVisible({ timeout: 15000 })
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    // 404 page doesn't need the task manager to load
    await expect(page.locator('text=404')).toBeVisible({ timeout: 15000 })
  })
})
