import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { createLinkedPair } from '../lib/seed'

// Deterministic spec for F41 — "Coach assigns custom anamnesis / plan". Strategy:
//   1. Seed an already-linked coach+client pair (createLinkedPair skips the F40
//      invite flow, which has its own dedicated spec).
//   2. Coach drives the real "New Training Plan" builder at
//      /clients/<id>/training/new — names the plan, adds a day, picks an
//      exercise from the shared catalog (seeded by migration 001) — and saves.
//   3. Assert the plan shows up as Active on the coach's client-detail page.
//   4. Client (separate browser context, logged in concurrently — same pattern
//      as invite-accept.spec.ts/F40) opens their own /training page and sees the
//      coach-assigned plan without having created anything themselves.

test('F41: coach assigns a training plan; client sees it', async ({ browser }) => {
  test.setTimeout(60_000)

  const { coach, clients } = await createLinkedPair(1)
  const client = clients[0]

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const coachCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const coachPage = await coachCtx.newPage()
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(coachPage)
  await routeSupabaseThroughNode(clientPage)

  const planName = 'E2E Assigned Plan'

  try {
    await loginAs(coachPage, coach)

    await test.step('coach: builds and saves a training plan for the client', async () => {
      await coachPage.goto(`/clients/${client.id}/training/new`, { waitUntil: 'networkidle' })

      await coachPage.getByPlaceholder('e.g. Push Pull Legs').fill(planName)
      await coachPage.getByRole('button', { name: '+ Add Day' }).click()
      await coachPage.getByRole('button', { name: /add exercise/i }).click()
      await coachPage.getByPlaceholder('Search exercises...').fill('Bench Press')
      await coachPage.getByRole('button', { name: /bench press/i }).first().click()

      await coachPage.getByRole('button', { name: /create training plan/i }).click()
      await expect(coachPage).toHaveURL(new RegExp(`/clients/${client.id}$`), { timeout: 15_000 })
    })

    await test.step('coach: the plan shows as Active on the client file', async () => {
      await expect(coachPage.getByText(planName)).toBeVisible()
      await expect(coachPage.getByText('Active').first()).toBeVisible()
    })

    await test.step('client: sees the coach-assigned plan on their own /training page', async () => {
      await loginAs(clientPage, client)
      await clientPage.goto('/training', { waitUntil: 'networkidle' })
      await expect(clientPage.getByText(planName).first()).toBeVisible({ timeout: 15_000 })
    })
  } finally {
    await coachCtx.close()
    await clientCtx.close()
  }
})
