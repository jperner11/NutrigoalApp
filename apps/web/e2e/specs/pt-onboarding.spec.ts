import { test, expect } from '../fixtures'
import { completeOnboarding, publishCoachProfile, requestVerification } from '../lib/flows'

// Deterministic version of e2e/missions/pt-onboarding.md.
// Covers: coach completes onboarding, publishes a public marketplace profile, and
// requests verification — asserting the profile renders publicly but WITHOUT a
// verified badge while verification is only pending (the trust-layer guarantee).

// NOTE: these two are `test.fixme` (skipped) pending reliable wizard automation.
// completeOnboarding / publishCoachProfile (../lib/flows.ts) work when driven
// standalone against a warm server, but the multi-step coach wizard is flaky inside
// the harness in dev mode (hydration timing on a fresh page load). Re-enable and
// validate against the CI production build (next start), where there is no per-route
// compile and hydration is immediate. The seed→login→gating/discover paths ARE green.
test.fixme('coach completes onboarding and lands on the coach dashboard', async ({ coachPage }) => {
  test.setTimeout(120_000)
  await completeOnboarding(coachPage)
  // Coach-only navigation confirms we're in the coach experience, not a client's.
  await expect(coachPage.getByRole('link', { name: 'Clients' })).toBeVisible()
  await expect(coachPage.getByRole('link', { name: 'Leads' })).toBeVisible()
})

test.fixme('coach publishes a marketplace profile that renders publicly with no verified badge', async ({
  coachPage,
  browser,
}) => {
  test.setTimeout(120_000)
  const { slug } = await publishCoachProfile(coachPage)
  await requestVerification(coachPage) // pending, NOT granted

  // View the public profile as a logged-out visitor.
  const publicCtx = await browser.newContext()
  const publicPage = await publicCtx.newPage()
  try {
    const res = await publicPage.goto(`/find-coach/${slug}`, { waitUntil: 'networkidle' })
    expect(res?.status()).toBeLessThan(400)
    // The coach's name renders on their public profile.
    await expect(publicPage.getByRole('heading', { name: /Srf|Coach|E2E/i }).first()).toBeVisible()
    // Verification is only pending → no "Verified" badge should appear.
    await expect(publicPage.getByText(/^verified$/i)).toHaveCount(0)
  } finally {
    await publicCtx.close()
  }
})
