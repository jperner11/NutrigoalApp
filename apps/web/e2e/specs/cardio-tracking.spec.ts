import { test, expect, loginAs } from '../fixtures'
import { upgradeUserRole } from '../lib/seed'

// Deterministic spec for F15 — "Cardio tracking (as Pro)". Strategy:
//   1. Seed a free client, then force-upgrade their role to 'pro' directly via
//      the admin API (upgradeUserRole) — the signup trigger only ever
//      bootstraps 'free'/'personal_trainer', so this is the only way to reach
//      a paid tier without touching real Stripe.
//   2. Log in and confirm /cardio renders the tracking form, not the
//      upgrade-to-Pro prompt (F14 already covers the free-tier gated view).
//   3. Log a session end-to-end and assert it appears in the session list.

test('F15 (e2e): Pro client logs a cardio session', async ({ client, page }) => {
  test.setTimeout(60_000)

  await upgradeUserRole(client.id, 'pro')
  await loginAs(page, client)

  await page.goto('/cardio', { waitUntil: 'networkidle' })

  // Pro tier: the tracking form renders, not the "Upgrade to Pro" lock screen.
  await expect(page.getByRole('link', { name: /upgrade to pro/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /log session/i })).toBeVisible()

  const durationInput = page.locator('input[type="number"]').first()
  await durationInput.fill('45')

  await page.getByPlaceholder('e.g. 145 bpm').fill('150')

  await page.getByRole('button', { name: /log session/i }).click()

  // The new session appears in the "Last 20" list with its logged duration.
  await expect(page.getByText('45').first()).toBeVisible({ timeout: 15_000 })
})
