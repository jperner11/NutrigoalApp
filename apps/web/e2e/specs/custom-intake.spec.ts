import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { createLinkedPair } from '../lib/seed'

// Deterministic spec for F42 — "Client completes assigned intake; coach sees it".
// Complements F41 (assign-plan.spec.ts), which covers the plan-assignment half of
// "coach assigns custom anamnesis / plan" — this spec covers the custom-anamnesis
// half end to end:
//   1. Seed an already-linked coach+client pair (createLinkedPair skips the F40
//      invite flow, which has its own dedicated spec). The client has NOT onboarded
//      yet (onboarding_completed defaults to false), so the onboarding wizard is
//      still reachable.
//   2. Coach adds a required custom intake question via the real /coach-questions
//      UI — an active question is what makes the "Coach Questions" step appear in
//      a managed client's onboarding wizard (MANAGED_CLIENT_STEPS in
//      app/(app)/onboarding/page.tsx).
//   3. Client completes onboarding; the "Coach-specific questions" step is reached
//      and answered like any other step.
//   4. Coach opens /clients/<id> and sees the "Custom intake answers" section with
//      the client's response — the data actually reached the coach's dashboard.

test('F42: coach creates a custom intake question, client answers it during onboarding, coach sees the response', async ({
  browser,
}) => {
  test.setTimeout(60_000)

  const { coach, clients } = await createLinkedPair(1)
  const client = clients[0]
  const questionLabel = 'What time of day do you usually train?'
  const answer = 'Evenings, after 6pm'

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  try {
    await loginAs(coachPage, coach)

    await test.step('coach: adds a required custom intake question', async () => {
      await coachPage.goto('/coach-questions', { waitUntil: 'networkidle' })
      await coachPage.getByRole('button', { name: 'New question' }).click()
      await coachPage.getByPlaceholder('e.g. What time do you usually train?').fill(questionLabel)
      await coachPage.getByRole('checkbox', { name: 'Required' }).check()
      await coachPage.getByRole('button', { name: /save question/i }).click()
      await expect(coachPage.getByText(questionLabel)).toBeVisible()
    })

    await test.step('client: reaches the Coach Questions step during onboarding and answers it', async () => {
      await loginAs(clientPage, client)
      await clientPage.goto('/onboarding', { waitUntil: 'networkidle' })
      const cont = clientPage.getByRole('button', { name: /continue/i })
      await cont.waitFor({ state: 'visible' })
      await clientPage.waitForTimeout(1500) // let React hydrate

      // Step 0 gate — same fields as the plain client wizard.
      await clientPage.getByPlaceholder('Your name', { exact: true }).fill('E2E Managed Client')
      await clientPage.getByPlaceholder('Years', { exact: true }).fill('28')
      await clientPage.getByPlaceholder('175', { exact: true }).fill('180')
      await clientPage.getByPlaceholder('70', { exact: true }).fill('76')

      let answeredCustomQuestion = false
      for (let i = 0; i < 14; i++) {
        // Managed clients (linked to a coach) get a different finish CTA than the
        // plain client wizard — "Submit intake to coach" instead of "Go to
        // Dashboard" (src/app/(app)/onboarding/page.tsx, isManagedClient branch).
        const finish = clientPage.getByRole('button', { name: /go to dashboard|submit intake to coach/i })
        if ((await finish.count()) && (await finish.first().isVisible().catch(() => false))) {
          await finish.first().click()
          break
        }

        if (await clientPage.getByText('Coach-specific questions').isVisible().catch(() => false)) {
          await clientPage.getByPlaceholder('Type your answer').fill(answer)
          answeredCustomQuestion = true
        }

        await expect(cont).toBeEnabled({ timeout: 10_000 })
        await cont.click()
        await clientPage.waitForTimeout(400)
      }

      expect(answeredCustomQuestion).toBe(true)
      await expect(clientPage).toHaveURL(/\/dashboard/, { timeout: 25_000 })
    })

    await test.step("coach: sees the client's custom intake answer on the client file", async () => {
      await coachPage.goto(`/clients/${client.id}`, { waitUntil: 'networkidle' })
      await expect(coachPage.getByText('Custom intake answers')).toBeVisible()
      await expect(coachPage.getByText(questionLabel)).toBeVisible()
      await expect(coachPage.getByText(answer)).toBeVisible()
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
