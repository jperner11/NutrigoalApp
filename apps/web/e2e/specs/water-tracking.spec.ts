import { test, expect } from '../fixtures'

// Deterministic spec for hydration tracking (free-tier client, /water).
// Not yet on a flow ID in flows-checklist.md — this is additive Playwright
// coverage for a simple, self-contained feature with no auth/Stripe/AI
// dependency, following the free-tier login strategy used by log-meal.spec.ts.
//
// Strategy: log in as a seeded free client (no onboarding needed — the page
// falls back to the default 2500ml target, and middleware never gates /water),
// then tap a quick-add button and assert the running total updates in place.

test('Water tracking: quick-add updates today\'s total', async ({ clientPage }) => {
  test.setTimeout(60_000)

  await clientPage.goto('/water', { waitUntil: 'networkidle' })

  // Fresh client, nothing logged today yet: total is 0, full 2500ml remaining.
  await expect(clientPage.locator('span.serif')).toHaveText('0', { timeout: 15_000 })
  await expect(clientPage.getByText('2500ml')).toBeVisible()

  await clientPage.getByRole('button', { name: '250ml' }).click()

  // Insert round-trips through Supabase before local state updates, so allow
  // a generous timeout — no page reload or server-side assertion needed.
  await expect(clientPage.locator('span.serif')).toHaveText('250', { timeout: 15_000 })
  await expect(clientPage.getByText('2250ml')).toBeVisible()
})
