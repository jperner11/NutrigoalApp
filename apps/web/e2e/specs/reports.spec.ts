import { test, expect } from '../fixtures'

// Deterministic spec for /reports — previously untested despite aggregating
// meal/workout/cardio/weight/water logs into adherence percentages
// (src/lib/reports.ts). A fresh free client has no logs yet, so this
// exercises the empty-state path: the divide-by-zero guards in
// generateWeeklyReport must produce 0%/"No data" rather than NaN or a crash,
// and the "days tracked" count must read 0 (a previous bug showed this as 1).

test('client sees a well-formed empty state on /reports with no logged data', async ({
  clientPage: page,
}) => {
  test.setTimeout(60_000)

  await page.goto('/reports', { waitUntil: 'networkidle' })

  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  // Adherence bars render (not stuck on "Loading report...") with their labels.
  await expect(page.getByText('Calorie Target')).toBeVisible()
  await expect(page.getByText('Water Intake')).toBeVisible()

  // Zero logged meals is reported as 0, not 1.
  await expect(page.getByText('0 days tracked')).toBeVisible()

  // No weight logs yet -> explicit "no data" card, not a NaN/crash.
  await expect(page.getByText('No data')).toBeVisible()
  await expect(page.getByText('Log weight to track changes')).toBeVisible()

  // Already on the current week, so forward navigation is disabled.
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled()
})
