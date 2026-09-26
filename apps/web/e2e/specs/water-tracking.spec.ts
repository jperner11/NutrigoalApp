import { test, expect } from '../fixtures'

// Deterministic spec for water-intake logging — previously untested.
// Like /progress/measurements, this page isn't tier-gated, so a fresh free
// client (clientPage) can hit it directly with no role upgrade needed.

test('client logs water intake', async ({ clientPage: page }) => {
  test.setTimeout(60_000)

  await page.goto('/water', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: '250ml' }).click()

  await expect(page.getByText('+250ml logged')).toBeVisible({ timeout: 15_000 })

  // The progress ring's running total reflects the logged amount.
  await expect(page.getByText('250', { exact: true })).toBeVisible()
})
