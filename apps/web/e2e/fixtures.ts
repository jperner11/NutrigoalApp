import { test as base, expect, type Page } from '@playwright/test'
import { createTestUser, deleteTestUser, type SeededUser, type SeedRole } from './lib/seed'

// Shared Playwright fixtures for the deterministic E2E layer.
//
// The pattern: seed a PRE-CONFIRMED user via the Supabase admin API (no email
// wall), then log in through the real /login form so we exercise actual auth.
// Each fixture tears its user down afterwards, so the test DB stays clean even
// if you never run the `cleanup` CLI.

/** Log a seeded user in via the real login form and wait until we leave /login. */
export async function loginAs(page: Page, user: SeededUser): Promise<void> {
  // networkidle ensures the page's JS has loaded and React has hydrated. Before
  // hydration the form's onSubmit (which calls preventDefault) isn't attached, so a
  // click triggers a NATIVE GET submit to "/login?" that reloads the page and wipes
  // the inputs — which is exactly the flake we hit in dev mode.
  await page.goto('/login', { waitUntil: 'networkidle' })

  // Retry the whole fill+submit: if a pre-hydration click ever does reload the page,
  // the next iteration re-fills the (now-empty) fields and tries again.
  // Login redirects to `next` (default /dashboard); onboarding-incomplete users get
  // bounced to /onboarding by middleware. Either way we end up off /login.
  await expect(async () => {
    await page.getByPlaceholder('your.email@example.com').fill(user.email)
    await page.getByPlaceholder('Enter your password').fill(user.password)
    await page.getByRole('button', { name: /enter dashboard/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 })
  }).toPass({ timeout: 30_000 })
}

interface SeededFixtures {
  /** A freshly seeded coach (personal_trainer), auto-deleted after the test. */
  coach: SeededUser
  /** A freshly seeded free client, auto-deleted after the test. */
  client: SeededUser
  /** A page already logged in as a fresh coach. */
  coachPage: Page
  /** A page already logged in as a fresh free client. */
  clientPage: Page
}

function seededUserFixture(role: SeedRole) {
  // Playwright requires the first fixture arg to be an object-destructuring pattern;
  // we use none of the base fixtures here, so destructure nothing from an empty type.
  return async (
    {}: Record<string, never>,
    use: (u: SeededUser) => Promise<void>,
  ): Promise<void> => {
    const user = await createTestUser(role)
    try {
      await use(user)
    } finally {
      await deleteTestUser(user.id)
    }
  }
}

export const test = base.extend<SeededFixtures>({
  coach: seededUserFixture('personal_trainer'),
  client: seededUserFixture('free'),

  coachPage: async ({ page, coach }, use) => {
    await loginAs(page, coach)
    await use(page)
  },

  clientPage: async ({ page, client }, use) => {
    await loginAs(page, client)
    await use(page)
  },
})

export { expect }
