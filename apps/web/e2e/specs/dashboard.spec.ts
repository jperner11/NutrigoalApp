import { test, expect } from '../fixtures'

// Deterministic spec for /dashboard — the page every client lands on after
// login, previously used only as a post-navigation target in other specs
// (e.g. smoke.spec.ts) and never asserted on for its own content. Covers the
// hero panel's quick actions and the "today" KPI row for a fresh free client
// with no logs yet, so the widgets must render their zero-state correctly.

test('client sees dashboard hero actions and today KPIs', async ({
  clientPage: page,
}) => {
  test.setTimeout(60_000)

  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  // Hero panel quick actions.
  await expect(page.getByRole('link', { name: /log weight/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /view today.s plan/i })).toBeVisible()
  // Free tier only: upgrade CTA.
  await expect(page.getByRole('link', { name: /upgrade/i })).toBeVisible()

  // Today's KPI row renders its zero-state without crashing.
  await expect(page.getByText('Calories')).toBeVisible()
  await expect(page.getByText('Water')).toBeVisible()
  await expect(page.getByText('Workouts today')).toBeVisible()
  await expect(page.getByText('Goal')).toBeVisible()
})
