import { test, expect } from '../fixtures'
import { publishCoachProfile } from '../lib/seed'

// Deterministic spec for F30 — "Discover coaches renders". Previously only
// smoke-tested as "GET /find-coach responds OK" (smoke.spec.ts), which proves the
// page boots but not that CoachDirectory's client-side fetch-and-render actually
// surfaces a published coach. /find-coach is a public marketing page, so this uses
// a logged-out page — no login needed.

test('a published coach appears as a card on the discover page and links to their profile', async ({
  page,
  coach,
}) => {
  const { slug } = await publishCoachProfile(coach.id, 'directory')

  await page.goto('/find-coach', { waitUntil: 'networkidle' })

  // The whole card is a single link; its accessible name includes the coach's
  // name and headline — 'directory' makes it unique to this test's seeded coach.
  const card = page.getByRole('link', { name: /E2E Coach.*E2E coach directory/s })
  await expect(card).toBeVisible({ timeout: 15_000 })

  await card.click()
  await expect(page).toHaveURL(new RegExp(`/find-coach/${slug}`))
})
