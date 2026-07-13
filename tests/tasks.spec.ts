import { test, expect } from '@playwright/test'
import { signUp, enterWorkspace } from './helpers/auth'
import { captureConsoleErrors } from './helpers/errors'
import { ACCOUNT_A } from './helpers/accounts'

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, ACCOUNT_A.email, { password: ACCOUNT_A.password, name: ACCOUNT_A.name })
    await enterWorkspace(page)
  })

  test('create a task via quick add', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    const taskName = `Test task ${Date.now()}`

    const input = page.getByTestId('quick-add-input')
    await expect(input).toBeVisible()
    await input.fill(taskName)
    await page.getByTestId('quick-add-submit').click()

    // Verify task appears in the task list area
    await expect(page.getByTestId('task-list')).toBeVisible()
    await expect(page.getByTestId('task-list').locator(`text=${taskName}`).first()).toBeVisible()

    expect(errors).toEqual([])
  })

  test('complete a task', async ({ page }) => {
    const taskName = `Complete me ${Date.now()}`

    const input = page.getByTestId('quick-add-input')
    await input.fill(taskName)
    await page.getByTestId('quick-add-submit').click()

    // Wait for task to appear
    await expect(page.getByTestId('task-list').locator(`text=${taskName}`).first()).toBeVisible()

    // Click the checkbox on the last task item (the one we just created)
    const taskItems = page.locator('[data-testid^="task-item-"]')
    const lastTask = taskItems.last()
    const checkbox = lastTask.locator('[data-testid^="task-checkbox-"]')
    await checkbox.click()

    // Switch to logbook to verify it appears there
    await page.getByTestId('nav-logbook').click()
    await expect(page.getByTestId('task-list').locator(`text=${taskName}`).first()).toBeVisible()
  })

  test('delete a task', async ({ page }) => {
    const taskName = `Delete me ${Date.now()}`

    const input = page.getByTestId('quick-add-input')
    await input.fill(taskName)
    await page.getByTestId('quick-add-submit').click()

    // The task is auto-selected after creation, so the detail panel should already be visible
    await expect(page.getByTestId('task-detail')).toBeVisible({ timeout: 5000 })

    // Click delete
    await page.getByTestId('task-detail-delete').click()

    // Verify it shows up in trash
    await page.getByTestId('nav-trash').click()
    await expect(page.getByTestId('task-list').locator(`text=${taskName}`).first()).toBeVisible()
  })

  test('create multiple tasks', async ({ page }) => {
    const suffix = Date.now()
    const input = page.getByTestId('quick-add-input')

    await input.fill(`Alpha ${suffix}`)
    await page.getByTestId('quick-add-submit').click()

    await input.fill(`Beta ${suffix}`)
    await page.getByTestId('quick-add-submit').click()

    await input.fill(`Gamma ${suffix}`)
    await page.getByTestId('quick-add-submit').click()

    const list = page.getByTestId('task-list')
    await expect(list.locator(`text=Alpha ${suffix}`).first()).toBeVisible()
    await expect(list.locator(`text=Beta ${suffix}`).first()).toBeVisible()
    await expect(list.locator(`text=Gamma ${suffix}`).first()).toBeVisible()
  })
})
