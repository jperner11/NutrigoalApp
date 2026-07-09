import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { publishCoachProfile, getTrainerLink } from '../lib/seed'

// Deterministic spec for F32 — "Request / hire a coach". A free client finds a
// published coach, submits the 4-step request wizard (Goal → Logistics →
// Message → Review), the coach sees it as a pending lead on /leads, accepts it,
// and the coach-client relationship is persisted — same end state as F40's
// invite-accept flow, reached via the marketplace instead of a direct invite.
//
// Coach and client need independent logged-in sessions alive at the same time,
// so this uses two separate browser contexts (the coachPage/clientPage fixtures
// share one underlying page and only suit single-user specs — see
// invite-accept.spec.ts for the same pattern).

test('F32: client requests a coach via the marketplace; coach accepts and the relationship is linked', async ({
  browser,
  coach,
  client,
}) => {
  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  try {
    const { slug } = await publishCoachProfile(coach.id, 'lead')

    await loginAs(clientPage, client)
    await loginAs(coachPage, coach)

    await test.step('client: submits a coaching request via the request wizard', async () => {
      await clientPage.goto(`/find-coach/${slug}`, { waitUntil: 'networkidle' })
      await clientPage.getByRole('link', { name: /request coaching/i }).click()
      await expect(clientPage).toHaveURL(new RegExp(`/find-coach/${slug}/request`))
      // Give the client wizard a moment to hydrate before the first click —
      // same pre-hydration race as the login form (see fixtures.ts loginAs).
      await clientPage.waitForTimeout(1000)

      // Step 1: Goal — pick one, then advance.
      await clientPage.getByRole('button', { name: 'Fat loss', exact: true }).click()
      await clientPage.getByRole('button', { name: 'Continue →' }).click()

      // Step 2: Logistics — every field has a default value, so Continue is
      // already enabled; no need to touch the selects.
      await clientPage.getByRole('button', { name: 'Continue →' }).click()

      // Step 3: Message — the only free-text gate.
      await clientPage.locator('textarea').fill('E2E test request — please ignore.')
      await clientPage.getByRole('button', { name: 'Continue →' }).click()

      // Step 4: Review — send it.
      await clientPage.getByRole('button', { name: /send request/i }).click()
      await expect(clientPage).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })

    await test.step('coach: sees the pending lead on /leads', async () => {
      await coachPage.goto('/leads', { waitUntil: 'networkidle' })
      await expect(coachPage.getByText(client.email)).toBeVisible({ timeout: 10_000 })
      await expect(coachPage.getByText('Fat loss')).toBeVisible()
    })

    await test.step('coach: accepts the lead', async () => {
      await coachPage.getByRole('button', { name: 'Accept lead' }).click()
      await expect(coachPage.getByText('Open client')).toBeVisible({ timeout: 10_000 })
    })

    await test.step('the coach-client relationship is persisted', async () => {
      const link = await getTrainerLink(client.id)
      expect(link.personalTrainerId).toBe(coach.id)
      expect(link.role).toBe('personal_trainer_client')
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
