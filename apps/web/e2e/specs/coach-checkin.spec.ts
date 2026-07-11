import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { createLinkedPair } from '../lib/seed'

// Deterministic spec for F51 — "Coach responds / check-in cycle". The check-in
// feature (feedback_requests, migration 004) is the real mechanism for this:
//   1. Seed an already-linked coach+client pair (createLinkedPair, same as F41-F43).
//   2. Coach sends a check-in from /clients/<id>/feedback (real POST via
//      feedback_requests insert — nutritionist_id = auth.uid() per the RLS policy).
//   3. Client (separate browser context, logged in concurrently) answers it on
//      /check-ins, closing the loop back to the coach.
//   4. Coach reopens /clients/<id>/feedback and sees the completed response —
//      proving the cycle reaches the coach for real.

test('F51: coach sends a check-in, client responds, coach reviews the answers', async ({
  browser,
}) => {
  test.setTimeout(60_000)

  const { coach, clients } = await createLinkedPair(1)
  const client = clients[0]
  const checkInTitle = 'E2E Weekly Check-in'
  const textAnswer = 'Feeling strong, more energy than last week.'

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  try {
    await loginAs(coachPage, coach)

    await test.step('coach: sends a check-in to the client', async () => {
      await coachPage.goto(`/clients/${client.id}/feedback`, { waitUntil: 'networkidle' })
      await coachPage.getByRole('button', { name: 'Send Check-in' }).first().click()

      await coachPage.getByPlaceholder('e.g. Weekly Check-in').fill(checkInTitle)
      // Default questions (text / rating / yes-no) are pre-filled — send as-is.
      await coachPage.getByRole('button', { name: 'Send to Client' }).click()

      await expect(coachPage.getByText(checkInTitle)).toBeVisible()
      await expect(coachPage.getByText('Pending')).toBeVisible()
    })

    await test.step('client: answers the check-in', async () => {
      await loginAs(clientPage, client)
      await clientPage.goto('/check-ins', { waitUntil: 'networkidle' })
      await clientPage.getByText(checkInTitle, { exact: true }).click()

      const feelBlock = clientPage.locator('div.rounded-xl.border').filter({ hasText: 'How are you feeling this week?' })
      await feelBlock.getByRole('textbox').fill(textAnswer)

      const energyBlock = clientPage.locator('div.rounded-xl.border').filter({ hasText: 'Energy level' })
      await energyBlock.getByRole('button', { name: '4', exact: true }).click()

      const planBlock = clientPage.locator('div.rounded-xl.border').filter({ hasText: 'Following the meal plan?' })
      await planBlock.getByRole('button', { name: 'Yes', exact: true }).click()

      await clientPage.getByRole('button', { name: 'Submit check-in' }).click()
      await expect(clientPage.getByText('Check-in submitted!')).toBeVisible()
    })

    await test.step('coach: sees the completed response', async () => {
      await coachPage.goto(`/clients/${client.id}/feedback`, { waitUntil: 'networkidle' })
      await coachPage.getByText(checkInTitle, { exact: true }).click()

      await expect(coachPage.getByText('Responded', { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(coachPage.getByText(textAnswer)).toBeVisible()
      await expect(coachPage.getByText('4 / 5')).toBeVisible()
      await expect(coachPage.getByText('Yes', { exact: true })).toBeVisible()
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
