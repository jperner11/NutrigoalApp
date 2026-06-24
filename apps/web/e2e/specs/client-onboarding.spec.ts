import { test, expect } from '../fixtures'
import { completeOnboarding } from '../lib/flows'

// Deterministic version of e2e/missions/client-onboarding.md.
// Covers: a free user completes onboarding, and the free-tier gates actually hold
// (paid surfaces show an upgrade prompt, NOT the feature) — the leak we most want
// to catch — plus the discover marketplace renders for a prospective buyer.

// fixme pending reliable wizard automation — see note in pt-onboarding.spec.ts.
// The gating + discover tests below do NOT depend on onboarding and ARE green.
test.fixme('free user completes onboarding and lands on the dashboard', async ({ clientPage }) => {
  test.setTimeout(120_000) // 9 wizard steps; dev-mode cold compiles are slow
  await completeOnboarding(clientPage) // asserts /dashboard internally
  await expect(clientPage).toHaveURL(/\/dashboard/)
})

test('free-tier gating holds on Pro-only surfaces', async ({ clientPage }) => {
  // Cardio is Pro-only: must show an upgrade prompt, not the tracking feature.
  await clientPage.goto('/cardio')
  await expect(clientPage.getByText(/cardio tracking is on pro/i)).toBeVisible()
  await expect(clientPage.getByRole('link', { name: /upgrade to pro/i }).first()).toBeVisible()

  // Supplements is Pro-only too.
  await clientPage.goto('/supplements')
  await expect(clientPage.getByText(/supplement tracking is a pro tool/i)).toBeVisible()
})

test('discover marketplace renders for a prospective client', async ({ clientPage }) => {
  await clientPage.goto('/discover')
  await expect(clientPage.getByText(/discover coaches/i).first()).toBeVisible()
})
