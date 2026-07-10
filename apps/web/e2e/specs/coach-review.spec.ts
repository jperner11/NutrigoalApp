import { test, expect, loginAs, routeSupabaseThroughNode } from '../fixtures'
import { createLinkedPair, createTestUser } from '../lib/seed'

// Deterministic spec for F50 — "Client leaves a review of coach". Real POST
// /api/coach-reviews, no mocking: CoachReviews.tsx on the public coach profile
// (/find-coach/<slug>) shows a star-rating form to any signed-in client eligible
// under has_coaching_relationship() (migration 057) — an accepted coach_lead, or a
// direct personal_trainer_id/nutritionist_id assignment. createLinkedPair sets the
// latter, so the linked client is eligible immediately, no F40 invite needed.
//
// Also covers the RLS gate's negative case (flagged as a "bonus assertion" in
// invite-to-review.spec.ts's mission stub): a signed-in client with NO relationship
// to the coach must not be able to post a review.

test('F50: linked client leaves a review; it appears on the coach public profile', async ({
  browser,
}) => {
  test.setTimeout(60_000)

  const { coach, clients, slug } = await createLinkedPair(1)
  const client = clients[0]
  const reviewTitle = 'Genuinely changed how I train'
  const reviewBody = 'E2E test review — clear plans, quick replies, measurable progress.'

  const ignoreHTTPSErrors = !!process.env.HTTPS_PROXY
  const clientCtx = await browser.newContext({ ignoreHTTPSErrors })
  const clientPage = await clientCtx.newPage()
  await routeSupabaseThroughNode(clientPage)

  try {
    await loginAs(clientPage, client)

    await test.step('client: sees the review form on the coach public profile', async () => {
      await clientPage.goto(`/find-coach/${slug}`, { waitUntil: 'networkidle' })
      await expect(clientPage.getByText(/how was coaching with/i)).toBeVisible({ timeout: 15_000 })
    })

    await test.step('client: rates 5 stars and posts a review', async () => {
      await clientPage.getByRole('button', { name: '5 stars' }).click()
      await clientPage.getByPlaceholder('Summarise it in a line (optional)').fill(reviewTitle)
      await clientPage.getByPlaceholder('What was the experience like? (optional)').fill(reviewBody)
      await clientPage.getByRole('button', { name: 'Post review' }).click()

      await expect(clientPage.getByText(/thanks for your review/i)).toBeVisible()
    })

    await test.step('client: the review and the refreshed aggregate rating render after reload', async () => {
      await clientPage.reload({ waitUntil: 'networkidle' })
      await expect(clientPage.getByText(reviewTitle)).toBeVisible({ timeout: 15_000 })
      // Scoped to the rendered review card's <p>, not the pre-filled "update your
      // review" textarea below it (which also contains this same text).
      await expect(clientPage.locator('p').filter({ hasText: reviewBody })).toBeVisible()
      await expect(clientPage.getByText(/update your review/i)).toBeVisible()
      // Denormalised rating_avg/rating_count (trigger in migration 057) reflects the new review.
      await expect(clientPage.getByText('5.0')).toBeVisible()
      await expect(clientPage.getByText(/1 review\b/)).toBeVisible()
    })
  } finally {
    await clientCtx.close()
  }

  const strangerCtx = await browser.newContext({ ignoreHTTPSErrors })
  const strangerPage = await strangerCtx.newPage()
  await routeSupabaseThroughNode(strangerPage)

  try {
    const stranger = await createTestUser('free')
    await loginAs(strangerPage, stranger)

    await test.step('a client with no relationship to this coach cannot review them', async () => {
      await strangerPage.goto(`/find-coach/${slug}`, { waitUntil: 'networkidle' })
      await expect(strangerPage.getByText(reviewTitle)).toBeVisible({ timeout: 15_000 })
      await expect(strangerPage.getByText(/how was coaching with/i)).not.toBeVisible()
      await expect(strangerPage.getByRole('button', { name: 'Post review' })).not.toBeVisible()
    })
  } finally {
    await strangerCtx.close()
  }
})
