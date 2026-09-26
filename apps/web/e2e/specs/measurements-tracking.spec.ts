import { test, expect } from '../fixtures'

// Deterministic spec for body-measurements tracking — previously untested.
// Unlike /cardio and /supplements, this page isn't tier-gated, so a fresh
// free client (clientPage) can hit it directly with no role upgrade needed.

test('client logs body measurements', async ({ clientPage: page }) => {
  test.setTimeout(60_000)

  await page.goto('/progress/measurements', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /log measurements/i }).click()

  await page.getByLabel('Waist').fill('80')
  await page.getByLabel('Chest').fill('100')

  await page.getByRole('button', { name: /^save$/i }).click()

  await expect(page.getByText('Measurements saved.')).toBeVisible({ timeout: 15_000 })

  // The "Latest" snapshot card renders the values we just saved.
  await expect(page.getByText('WAIST')).toBeVisible()
  await expect(page.getByText('80').first()).toBeVisible()
  await expect(page.getByText('CHEST')).toBeVisible()
  await expect(page.getByText('100').first()).toBeVisible()
})
