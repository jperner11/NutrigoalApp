import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { seedPendingInvite, getTrainerLink } from '../lib/seed'

// Deterministic spec for F40 — "Coach invites client / client accepts".
//
// The real invite is created via POST /api/personal-trainer/invites, which hard-
// requires RESEND_API_KEY to send the invite email and fails closed
// ("Email sending is not configured.") when it's unset — as it is in this e2e/CI
// environment (no RESEND_API_KEY in e2e.yml or here). So this spec seeds the
// pending personal_trainer_invites row directly (seedPendingInvite mirrors the
// columns the real route inserts, minus the email) and drives everything
// downstream for real: the coach sees the invite on /clients, and the client
// accepts it through the actual /invite/accept UI.
//
// Coach and client need independent logged-in sessions alive at the same time,
// so this uses two separate browser contexts (the coachPage/clientPage fixtures
// share one underlying page and only suit single-user specs).

test('F40: coach sees a pending invite; client accepts it and becomes linked', async ({
  browser,
  coach,
  client,
}) => {
  // ignoreHTTPSErrors + routeSupabaseThroughNode replicate what the extended
  // `page` fixture gets automatically — required in cloud runs where the MITM
  // proxy resets direct browser->Supabase TLS (canonical issue #57).
  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  try {
    await loginAs(coachPage, coach)
    await loginAs(clientPage, client)

    const token = await seedPendingInvite(coach.id, client.email)
    expect(token).toBeTruthy()

    await test.step('coach: sees the pending invite on /clients', async () => {
      await coachPage.goto('/clients')
      await expect(coachPage.getByText(client.email).first()).toBeVisible()
      await expect(coachPage.getByText('Awaiting client acceptance')).toBeVisible()
    })

    await test.step('client: accepts the invite via /invite/accept', async () => {
      // No query params — the page auto-discovers the pending invite for the
      // logged-in user's email, same as a client who lost the emailed link.
      await clientPage.goto('/invite/accept')
      await expect(clientPage.getByRole('heading', { name: /join/i })).toBeVisible()
      await clientPage.getByRole('button', { name: /accept invite/i }).click()
      await expect(clientPage).toHaveURL(/\/onboarding/, { timeout: 10_000 })
    })

    await test.step('the coach-client relationship is persisted', async () => {
      const link = await getTrainerLink(client.id)
      expect(link.personalTrainerId).toBe(coach.id)
      expect(link.role).toBe('personal_trainer_client')
    })

    await test.step('coach: client now shows as active on /clients', async () => {
      await coachPage.goto('/clients')
      await expect(coachPage.getByText(client.email).first()).toBeVisible()
      await expect(coachPage.getByText('active', { exact: true })).toBeVisible()
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
