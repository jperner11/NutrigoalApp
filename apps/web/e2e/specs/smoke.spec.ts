import { test, expect, loginAs } from '../fixtures'

// Smoke layer: the always-green backbone. These are intentionally shallow and
// robust — they prove the app boots against the test project, public pages render,
// and seeded auth works. If any of these go red, something is badly broken and the
// deeper flow specs aren't worth running.

test.describe('public pages render', () => {
  for (const path of ['/', '/login', '/signup', '/pricing', '/find-coach', '/for-coaches']) {
    test(`GET ${path} responds OK`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res, `no response for ${path}`).toBeTruthy()
      expect(res!.status(), `bad status for ${path}`).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test('login form has the expected fields', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByPlaceholder('your.email@example.com')).toBeVisible()
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  await expect(page.getByRole('button', { name: /enter dashboard/i })).toBeVisible()
})

test('a seeded coach can log in', async ({ page, coach }) => {
  await loginAs(page, coach)
  // Off the login page and into an authenticated area (dashboard or onboarding).
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
})

test('a seeded client can log in', async ({ page, client }) => {
  await loginAs(page, client)
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
})

test('logged-out users are kept out of the app', async ({ page }) => {
  const res = await page.goto('/dashboard')
  expect(res).toBeTruthy()
  // Middleware should redirect an unauthenticated visitor to login.
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
})

// F03 — Log out: sidebar Sign Out → /login; subsequent protected route still redirects.
test('a logged-in user can sign out and is denied re-entry', async ({ page, client }) => {
  await loginAs(page, client)
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })

  // On mobile viewports the sidebar is off-canvas — open the hamburger first,
  // exactly as a real thumb would. The open+tap runs as ONE retryable unit:
  // Sidebar closes the drawer on any pathname event (Sidebar.tsx close-on-route-
  // change effect), and on WebKit a late router event can snap it shut between
  // opening and tapping — the retry re-opens and taps again, like a real user.
  const signOut = page.getByRole('button', { name: /sign out/i })
  const hamburger = page.getByRole('button', { name: 'Open menu' })
  await expect(async () => {
    if (await hamburger.isVisible()) await hamburger.click()
    await signOut.click({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

  // After sign-out the session is gone; protected routes must still redirect.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
})
