import { test, expect, type Page } from '@playwright/test'
import { signUp } from './helpers/auth'

/**
 * Team invite flow — reproduces the reported bug end-to-end:
 * A invites B by email, assigns B a task inside a fresh team.
 * B then signs in and must:
 *   1. auto-join the team (no manual team-ID paste),
 *   2. see the team's project + task (fresh permission caches),
 *   3. own the task that was assigned to their pending invite.
 * A must see B as an Active member with no ghost "invited" row.
 *
 * Public signup is disabled on the dev auth worker, so this reuses the two
 * CLI-provisioned test accounts and creates a brand-new team per run.
 */
const ALICE = { email: 'alice-1777048251@deepspace.test', password: 'Pass123!', name: 'Alice' }
const BOB = { email: 'bob-1777048251@deepspace.test', password: 'Pass123!', name: 'Bob' }

/** Create a brand-new team through the team selector → onboarding popup. */
async function createFreshTeam(page: Page, teamName: string) {
  await page.goto('/home')
  await expect(page.getByTestId('app-container')).toBeVisible({ timeout: 20000 })
  await page.getByTestId('team-selector-trigger').click()
  await page.getByRole('button', { name: 'Create New Team' }).click()
  await page.getByPlaceholder('Acme Inc').fill(teamName)
  await page.getByRole('button', { name: 'Create team', exact: true }).click()
  // The selector trigger now shows the new team
  await expect(page.getByTestId('team-selector-trigger')).toContainText(teamName, { timeout: 15000 })
}

test.describe('Team invite flow', () => {
  test('invited user auto-joins, sees team data, and inherits assigned tasks', async ({ browser }) => {
    test.setTimeout(180_000)
    const stamp = Date.now()
    const teamName = `Invite ${stamp}`
    const projectName = `p1-${stamp}`
    const taskTitle = `Launch prep ${stamp}`

    const ctxA = await browser.newContext()
    const a = await ctxA.newPage()
    const ctxB = await browser.newContext()
    const b = await ctxB.newPage()

    try {
      // ── A: sign in, create a fresh team ────────────────────────────────
      await signUp(a, ALICE.email, ALICE)
      await createFreshTeam(a, teamName)

      // ── A: create project p1 ───────────────────────────────────────────
      await a.getByTestId('sidebar-header-add-btn').click()
      await a.getByPlaceholder('Project name').fill(projectName)
      await a.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(a.getByTestId('sidebar').getByText(projectName)).toBeVisible()

      // ── A: invite B by email ───────────────────────────────────────────
      await a.locator('button[title="Team Settings"]').click()
      await a.getByRole('button', { name: 'Invite member' }).click()
      await a.getByPlaceholder('Enter email address…').fill(BOB.email)
      await a.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(a.getByText(BOB.email).first()).toBeVisible({ timeout: 10000 })
      // The just-added member must never render as "Anonymous" (stale
      // directory profiles fall back to the membership email — no refresh
      // required)
      await expect(a.getByText('Anonymous', { exact: true })).toHaveCount(0)
      await a.getByText('Back to app').click()
      await expect(a.getByTestId('app-container')).toBeVisible()

      // ── A: create a task inside p1 and assign it to B ──────────────────
      // (project creation navigates into the project view, so QuickAdd adds
      // directly to p1 — mirrors the reported scenario)
      // B may be a pending invite (directory row missing an email) or an
      // instantly-Active member (directory healed by a previous backfill) —
      // both appear in the assignee menu labeled with the email.
      const quickAdd = a.locator('[data-quick-add] input').first()
      await quickAdd.fill(taskTitle)
      await quickAdd.press('Enter')
      // QuickAdd auto-selects the new task → detail panel opens
      await expect(a.getByTestId('task-detail')).toBeVisible({ timeout: 10000 })
      await a.getByTestId('task-detail').getByText('Unassigned').first().click()
      await a.getByText(BOB.email).last().click()
      // Once assigned, the trigger no longer reads "Unassigned"
      await expect(a.getByTestId('task-detail').getByText('Unassigned')).toHaveCount(0, { timeout: 10000 })

      // ── B: sign in → auto-claim runs on load ──────────────────────────
      await signUp(b, BOB.email, BOB)
      await b.goto('/home')
      await expect(b.getByTestId('app-container')).toBeVisible({ timeout: 30000 })
      // The auto-join guarantee: the invite team appears in B's team list
      // WITHOUT pasting a team ID. (With several pending invites claimed at
      // once, auto-landing may pick another claimed team — switch if needed.
      // The claim + one-time reload can land a moment after first paint, so
      // poll.)
      const trigger = b.getByTestId('team-selector-trigger')
      await expect(async () => {
        const txt = (await trigger.textContent()) || ''
        if (txt.includes(teamName)) return
        await trigger.click()
        await b.getByRole('button', { name: teamName }).click({ timeout: 2000 })
      }).toPass({ timeout: 45000, intervals: [1500] })
      await expect(trigger).toContainText(teamName, { timeout: 15000 })

      // ── B: sees the team's project and task (permissions are live) ────
      await expect(b.getByTestId('sidebar').getByText(projectName)).toBeVisible({ timeout: 15000 })
      await expect(b.getByText(taskTitle)).toBeVisible({ timeout: 15000 })

      // ── B: the task belongs to B (name from directory or email fallback)
      const bobNameRe = new RegExp(`${BOB.name}|${BOB.email.split('@')[0]}`)
      await b.getByText(taskTitle).click()
      await expect(b.getByTestId('task-detail')).toBeVisible({ timeout: 10000 })
      await expect(
        b.getByTestId('task-detail').getByText(bobNameRe).first()
      ).toBeVisible({ timeout: 20000 })

      // ── A: B shows as an Active member, no ghost invite ───────────────
      await a.reload()
      await expect(a.getByTestId('app-container')).toBeVisible({ timeout: 20000 })
      await a.locator('button[title="Team Settings"]').click()
      await expect(a.getByText(bobNameRe).first()).toBeVisible({ timeout: 15000 })
      await expect(a.getByText('Invited', { exact: true })).toHaveCount(0)

      // ── A: the pending-invite path still works for unknown emails ─────
      // (an email with no account stays a pending "Invited" row)
      const ghostEmail = `ghost-${stamp}@deepspace.test`
      await a.getByRole('button', { name: 'Invite member' }).click()
      await a.getByPlaceholder('Enter email address…').fill(ghostEmail)
      await a.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(a.getByText(ghostEmail).first()).toBeVisible({ timeout: 10000 })
      await expect(a.getByText('Invited', { exact: true }).first()).toBeVisible({ timeout: 10000 })
      await a.getByText('Back to app').click()
      await expect(a.getByTestId('app-container')).toBeVisible()

      // ── Real-time: A's changes reach B live (no reload on B's side) ───
      // B stays parked on the task list. A creates a new task; it must
      // appear on B's screen via the websocket push alone.
      const liveTitle = `Realtime ping ${stamp}`
      const quickAdd2 = a.locator('[data-quick-add] input').first()
      await quickAdd2.fill(liveTitle)
      await quickAdd2.press('Enter')
      await expect(b.getByText(liveTitle)).toBeVisible({ timeout: 15000 })

      // And an edit: A renames the just-created task (QuickAdd auto-selects
      // it, so the detail panel is already on it); B sees the new title live.
      const renamed = `Renamed live ${stamp}`
      await a.getByTestId('task-detail').getByTestId('task-detail-title').fill(renamed)
      await a.getByTestId('task-detail').getByTestId('task-detail-title').blur()
      await expect(b.getByText(renamed)).toBeVisible({ timeout: 15000 })
    } finally {
      await ctxA.close()
      await ctxB.close()
    }
  })
})
