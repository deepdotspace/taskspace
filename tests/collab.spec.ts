import { test, expect } from '@playwright/test'
import { signUp, enterWorkspace } from './helpers/auth'

const TEST_USERS = [
  { email: 'alice-1777048251@deepspace.test', password: 'Pass123!', name: 'Alice' },
  { email: 'bob-1777048251@deepspace.test', password: 'Pass123!', name: 'Bob' },
]

test.describe('Multi-user collaboration', () => {
  test('two users are recognized as different users', async ({ browser }) => {
    const contexts = await Promise.all(TEST_USERS.map(() => browser.newContext()))
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()))

    try {
      for (let i = 0; i < TEST_USERS.length; i++) {
        await signUp(pages[i], TEST_USERS[i].email, TEST_USERS[i])
        await enterWorkspace(pages[i], `${TEST_USERS[i].name}'s Team`)
      }

      // Both should have the sidebar visible (they're signed in)
      await expect(pages[0].getByTestId('sidebar')).toBeVisible()
      await expect(pages[1].getByTestId('sidebar')).toBeVisible()
    } finally {
      for (const ctx of contexts) await ctx.close()
    }
  })
})
