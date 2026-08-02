import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { createLinkedPair } from '../lib/seed'

// Deterministic spec for F43 — "Coach reviews client & leaves guidance". The app has
// no separate "notes"/"guidance" feature (checked migrations + client-detail page) —
// the coach's real way to leave guidance for a client is the direct-message thread:
//   1. Seed an already-linked coach+client pair (createLinkedPair, same as F41/F42).
//   2. Coach opens the client file at /clients/<id>, reviews it, then opens
//      /clients/<id>/messages and sends a guidance message. Only the coach can create
//      the conversation row (RLS), which this exercises for real.
//   3. Client (separate browser context, logged in concurrently — same pattern as
//      F40/F41/F42) opens their own /my-nutritionist/messages and sees the coach's
//      guidance message.

test('F43: coach reviews a client and leaves guidance via the message thread', async ({
  browser,
}) => {
  test.setTimeout(60_000)

  const { coach, clients } = await createLinkedPair(1)
  const client = clients[0]
  const guidanceMessage = 'Great work this week — bump your protein target by 20g and keep the cardio sessions at 3x.'

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  try {
    await loginAs(coachPage, coach)

    await test.step('coach: reviews the client file', async () => {
      await coachPage.goto(`/clients/${client.id}`, { waitUntil: 'networkidle' })
      await expect(coachPage.getByRole('link', { name: /messages/i })).toBeVisible()
    })

    await test.step('coach: opens the thread and sends guidance', async () => {
      await coachPage.getByRole('link', { name: /messages/i }).click()
      await expect(coachPage).toHaveURL(new RegExp(`/clients/${client.id}/messages$`))

      const input = coachPage.getByPlaceholder('Type a message...')
      await expect(input).toBeEnabled({ timeout: 15_000 })
      await input.fill(guidanceMessage)
      await coachPage.getByRole('button', { name: 'Send message' }).click()

      await expect(coachPage.getByText(guidanceMessage)).toBeVisible()
    })

    await test.step('client: sees the coach guidance in their own thread', async () => {
      await loginAs(clientPage, client)
      await clientPage.goto('/my-nutritionist/messages', { waitUntil: 'networkidle' })
      await expect(clientPage.getByText(guidanceMessage)).toBeVisible({ timeout: 15_000 })
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
