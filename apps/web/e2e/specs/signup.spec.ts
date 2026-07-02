import { test, expect } from '../fixtures'
import { deleteTestUserByEmail } from '../lib/seed'
import { e2eEnv } from '../lib/env'

// Flow F01 — Sign up (create account).
// The full-flow test requires "Confirm email" to be OFF on the test Supabase project so
// signup logs the user straight in and hard-redirects to /onboarding. Emails use the
// `treno-e2e+` prefix so they're recognised by cleanup; each run generates a unique one
// and deletes the created user afterwards.

const SUBMIT = 'button[type="submit"]'
const signupEmail = (tag: string) =>
  `treno-e2e+signup-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@${e2eEnv.emailDomain}`

test('the signup page renders the account form', async ({ page }) => {
  await page.goto('/signup', { waitUntil: 'networkidle' })
  await expect(page.locator('#signup-full-name')).toBeVisible()
  await expect(page.locator('#signup-email')).toBeVisible()
  await expect(page.locator('#signup-password')).toBeVisible()
  await expect(page.locator('#signup-confirm-password')).toBeVisible()
  await expect(page.locator(SUBMIT)).toBeVisible()
})

test('mismatched passwords are rejected without creating an account', async ({ page }) => {
  await page.goto('/signup', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500) // let React hydrate before interacting
  await page.locator('#signup-full-name').fill('E2E Mismatch')
  await page.locator('#signup-email').fill(signupEmail('mismatch'))
  await page.locator('#signup-password').fill('Password123!')
  await page.locator('#signup-confirm-password').fill('Different123!')
  await page.locator(SUBMIT).click()
  // Client-side guard fires before any signUp() call — no account is created.
  await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  await expect(page).toHaveURL(/\/signup/)
})

test('a new user can sign up and reaches onboarding', async ({ page }) => {
  test.setTimeout(60_000)
  const email = signupEmail('full')
  try {
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500) // hydrate before submitting (avoids dropped click)
    await page.locator('#signup-full-name').fill('E2E Signup')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill('Password123!')
    await page.locator('#signup-confirm-password').fill('Password123!')
    await page.locator(SUBMIT).click()
    // Confirm-email is off on the test project → auto sign-in → redirect to onboarding.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 })
  } finally {
    await deleteTestUserByEmail(email) // clean up regardless of assertion outcome
  }
})
