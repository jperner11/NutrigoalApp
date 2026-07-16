import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { linkClientToTrainer, seedCustomIntakeQuestion } from '../lib/seed'

// Deterministic spec for F42 — "Client completes assigned intake; coach sees it".
//
// Strategy:
//   1. Link a seeded coach + client directly (linkClientToTrainer mirrors what the
//      real invite-accept route writes — F40 already has its own dedicated spec).
//   2. Seed one active, required custom intake question for the coach (bypassing
//      the /coach-questions UI, same pattern as other seed helpers) so the
//      client's onboarding wizard picks up the extra "Coach Questions" step
//      (MANAGED_CLIENT_STEPS in onboarding/page.tsx, gated on
//      coachCustomQuestions.length > 0).
//   3. Client drives the real 10-step onboarding wizard, answering the coach's
//      question when that step appears, and reaches /dashboard.
//   4. Coach (separate browser context, logged in concurrently) opens the real
//      client-detail page and sees the "Custom intake answers" section render
//      the client's exact answer.

test('F42: client completes coach-assigned custom intake question; coach sees the response', async ({
  browser,
  coach,
  client,
}) => {
  test.setTimeout(60_000)

  await linkClientToTrainer(client.id, coach.id)
  const question = await seedCustomIntakeQuestion(coach.id, {
    label: 'What time do you usually train?',
    type: 'short_text',
    required: true,
  })

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  const answerText = 'Usually around 7am before work.'

  try {
    await loginAs(clientPage, client)

    await test.step('client: completes onboarding, answering the coach-specific question', async () => {
      await clientPage.goto('/onboarding', { waitUntil: 'networkidle' })
      const cont = clientPage.getByRole('button', { name: /continue/i })
      await cont.waitFor({ state: 'visible' })
      await clientPage.waitForTimeout(1500) // let React hydrate (pre-hydration clicks no-op)

      // Step 0 gate — the only step that blocks Continue.
      await clientPage.getByPlaceholder('Your name', { exact: true }).fill('E2E Managed Client')
      await clientPage.getByPlaceholder('Years', { exact: true }).fill('28')
      await clientPage.getByPlaceholder('175', { exact: true }).fill('170')
      await clientPage.getByPlaceholder('70', { exact: true }).fill('65')

      for (let i = 0; i < 13; i++) {
        // Managed clients' review step submits to their coach ("Submit intake to
        // coach") instead of the free-client "Go to Dashboard" — either ends the loop.
        const finish = clientPage.getByRole('button', { name: /go to dashboard|submit intake to coach/i })
        if ((await finish.count()) && (await finish.first().isVisible().catch(() => false))) {
          await finish.first().click()
          break
        }

        if (await clientPage.getByText(/coach-specific questions/i).isVisible().catch(() => false)) {
          await clientPage.getByPlaceholder('Type your answer').first().fill(answerText)
        }

        await expect(cont).toBeEnabled({ timeout: 10_000 })
        await cont.click()
        await clientPage.waitForTimeout(400)
      }

      await expect(clientPage).toHaveURL(/\/dashboard/, { timeout: 25_000 })
    })

    await test.step('coach: sees the client\'s custom-question answer on the client file', async () => {
      await loginAs(coachPage, coach)
      await coachPage.goto(`/clients/${client.id}`, { waitUntil: 'networkidle' })
      await expect(coachPage.getByText('Custom intake answers')).toBeVisible()
      await expect(coachPage.getByText(question.label)).toBeVisible()
      await expect(coachPage.getByText(answerText)).toBeVisible()
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
