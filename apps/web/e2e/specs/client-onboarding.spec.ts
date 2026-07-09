import { test, expect } from '../fixtures'
import { completeClientOnboarding } from '../lib/flows'

// Deterministic version of e2e/missions/client-onboarding.md.
// Covers: a free user completes onboarding, and the free-tier gates actually hold
// (paid surfaces show an upgrade prompt, NOT the feature) — the leak we most want
// to catch — plus the discover marketplace renders for a prospective buyer.

// The anamnesis questionnaire renders for a brand-new free user: a fresh signup is
// routed into the intake wizard, step 1 of 9 shows, and the first question is on
// screen. This reliably catches a broken/blank/erroring questionnaire — the most
// common regression — without depending on driving all 9 steps.
test('the onboarding questionnaire loads for a new client', async ({ clientPage }) => {
  await clientPage.goto('/onboarding', { waitUntil: 'networkidle' })
  await expect(clientPage).toHaveURL(/\/onboarding/)
  await expect(clientPage.getByText(/01\s*\/\s*09/)).toBeVisible()
  await expect(clientPage.getByText(/get to know you/i)).toBeVisible()
  await expect(clientPage.getByRole('button', { name: /continue|next/i }).first()).toBeVisible()
})

// Full 9-step completion (flow F10). Deterministic: the client wizard only gates
// Continue on step 0, so completeClientOnboarding fills step 0 and clicks through to the
// dashboard (taking "Go to Dashboard", never "Generate AI Plans"). Requires the
// user_profiles onboarding columns from migration 060.
test('free user completes the full questionnaire and reaches the dashboard', async ({
  clientPage,
}) => {
  test.setTimeout(120_000)
  await completeClientOnboarding(clientPage)
  await expect(clientPage).toHaveURL(/\/dashboard/)
})

test('free-tier gating holds on Pro-only surfaces', async ({ clientPage }) => {
  // Cardio is Pro-only: must show an upgrade prompt, not the tracking feature.
  await clientPage.goto('/cardio')
  await expect(clientPage.getByText(/cardio tracking is on pro/i)).toBeVisible()
  await expect(clientPage.getByRole('link', { name: /upgrade to pro/i }).first()).toBeVisible()

  // Supplements is Pro-only too. Let the previous page's client-side routing
  // settle first — WebKit aborts a goto that races an in-flight navigation.
  await clientPage.waitForLoadState('networkidle')
  await clientPage.goto('/supplements')
  await expect(clientPage.getByText(/supplement tracking is a pro tool/i)).toBeVisible()
})

test('discover marketplace renders for a prospective client', async ({ clientPage }) => {
  await clientPage.goto('/discover')
  await expect(clientPage.getByText(/discover coaches/i).first()).toBeVisible()
})
