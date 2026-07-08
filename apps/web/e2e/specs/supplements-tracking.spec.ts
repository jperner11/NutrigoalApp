import { test, expect, loginAs } from '../fixtures'
import { upgradeUserRole } from '../lib/seed'

// Deterministic spec for F16 — "Supplements tracking (as Pro)". Mirrors the
// cardio-tracking spec's strategy (F15):
//   1. Seed a free client, then force-upgrade their role to 'pro' directly via
//      the admin API (upgradeUserRole) — the signup trigger only ever
//      bootstraps 'free'/'personal_trainer', so this is the only way to reach
//      a paid tier without touching real Stripe.
//   2. Log in and confirm /supplements renders the tracking UI, not the
//      upgrade-to-Pro prompt.
//   3. Add a supplement and mark it taken end-to-end.

test('F16 (e2e): Pro client tracks a supplement', async ({ client, page }) => {
  test.setTimeout(60_000)

  await upgradeUserRole(client.id, 'pro')
  await loginAs(page, client)

  await page.goto('/supplements', { waitUntil: 'networkidle' })

  // Pro tier: the tracking UI renders, not the "Upgrade to Pro" lock screen.
  await expect(page.getByRole('link', { name: /upgrade to pro/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add supplement/i })).toBeVisible()

  await page.getByRole('button', { name: /add supplement/i }).click()

  await page.getByPlaceholder('e.g., Vitamin D').fill('Vitamin D3')
  await page.getByPlaceholder('e.g., 1000 IU').fill('2000 IU')

  await page.getByRole('button', { name: /^add supplement$/i }).click()

  // The new supplement appears in the stack list.
  await expect(page.getByText('Vitamin D3')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('2000 IU')).toBeVisible()

  // Mark it taken today — the toggle button flips to pressed and the
  // TODAY progress counter updates from 0/1 to 1/1.
  const takenToggle = page.getByRole('button', { name: /mark vitamin d3 as taken today/i })
  await takenToggle.click()
  await expect(page.getByRole('button', { name: /mark vitamin d3 as not taken today/i })).toHaveAttribute('aria-pressed', 'true')
})
