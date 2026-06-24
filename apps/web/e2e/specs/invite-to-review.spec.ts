import { test, expect } from '../fixtures'

// Deterministic version of e2e/missions/invite-to-review.md — the core coach↔client
// loop and the most important flow to protect. Uses two browser contexts so a coach
// and a client are logged in simultaneously.
//
// Marked test.fixme until selectors are confirmed against the live test env. Run the
// agentic invite-to-review mission first, then harden these locators.

test.fixme('coach invites client → plan delivered → review shows on profile', async ({
  browser,
  coach,
  client,
}) => {
  const coachCtx = await browser.newContext()
  const clientCtx = await browser.newContext()
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()

  const { loginAs } = await import('../fixtures')
  await loginAs(coachPage, coach)
  await loginAs(clientPage, client)

  try {
    await test.step('coach: publish profile and invite the client', async () => {
      // TODO(selectors): ensure onboarding done + profile public; Clients → invite
      // by client.email.
    })

    await test.step('client: accept the invite, become a managed client', async () => {
      await clientPage.goto('/my-nutritionist')
      // TODO(selectors): find/accept the invite; assert the coaching relationship.
    })

    await test.step('coach: deliver a plan to the client', async () => {
      // TODO(selectors): open the client, create a meal or training plan.
    })

    await test.step('client: sees the delivered plan', async () => {
      // TODO(selectors): plan visible under "my coach" / plans.
    })

    await test.step('client: leaves a review; it appears on the public profile', async () => {
      // TODO(selectors): go to /find-coach/<slug>, submit rating + text.
      // Reload; assert rating + review render and the directory card shows stars.
    })

    // Bonus assertion worth adding once the above works: a NON-client cannot review
    // (the RLS gate in migration 057). Seed a second free user and confirm the
    // review action is blocked for them.
    expect(true).toBe(true)
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
