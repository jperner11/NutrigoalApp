import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, generateRecoveryLink } from '../lib/seed'
import { loginAs } from '../fixtures'

// F04 — Password reset request.
// /reset-password serves two modes: with a recovery/invite token in the URL hash
// it renders the set-password form; without one it renders the email-request form
// (supabase.auth.resetPasswordForEmail). Issue #62 (missing request UI) is fixed.

test.describe('F04 — Password reset request', () => {
  test('/reset-password page responds OK', async ({ page }) => {
    const res = await page.goto('/reset-password')
    expect(res, 'no response from /reset-password').toBeTruthy()
    expect(res!.status(), '/reset-password returned an error status').toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('/login has a "Forgot your password?" link pointing to /reset-password', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    const link = page.getByRole('link', { name: /forgot your password/i })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/reset-password/)
  })

  test(
    '/reset-password without a token shows an email-request form',
    async ({ page }) => {
      await page.goto('/reset-password', { waitUntil: 'networkidle' })
      await expect(
        page.getByRole('textbox', { name: /email/i }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /send|reset|request/i }),
      ).toBeVisible()
    },
  )

  test('submitting the request form shows the check-your-inbox state', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'networkidle' })
    await page.getByRole('textbox', { name: /email/i }).fill('treno-e2e+reset-req@e2e.treno.test')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/check your inbox/i)).toBeVisible()
  })

  test('full loop: recovery link → set new password → sign in with it', async ({ page, baseURL }) => {
    const user = await createTestUser('free')
    const newPassword = `Reset!${Date.now().toString(36)}A1`
    try {
      // The link the reset email would contain (admin-minted; no inbox in e2e).
      const link = await generateRecoveryLink(user.email, `${baseURL}/reset-password`)
      await page.goto(link, { waitUntil: 'networkidle' })

      await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
      await page.getByLabel('New password', { exact: true }).fill(newPassword)
      await page.getByLabel('Confirm password', { exact: true }).fill(newPassword)
      await page.getByRole('button', { name: /save password/i }).click()
      await page.waitForURL('**/dashboard**', { timeout: 15_000 })

      // Fresh context state: drop the recovery session, then sign in with the
      // NEW password through the real login form (shared helper).
      await page.context().clearCookies()
      await loginAs(page, { ...user, password: newPassword })
    } finally {
      await deleteTestUser(user.id)
    }
  })
})
