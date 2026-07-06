import { test, expect } from '@playwright/test'

// F04 — Password reset request.
// Shallow checks: the page renders, the /login "Forgot your password?" link is
// present, and the /reset-password page loads without an HTTP error.
//
// NOTE: a general "forgot password" request flow (email input → send reset link)
// does NOT exist in the current UI. The /reset-password page only serves the
// post-invite "set your password" step (requires a valid token in the URL hash).
// Visiting /reset-password without a token shows "invalid link" rather than an
// email-request form. This is tracked in GitHub issue #<tbd> (label: qa).
//
// The fixme test below documents the expected (not-yet-implemented) behaviour.

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

  // FIXME: This test documents the missing "forgot password" request UI.
  // /reset-password should render an email-input form so users who are not
  // arriving via an invite link can still request a password-reset email.
  // Currently, visiting /reset-password without a valid token hash shows an
  // "invalid link" banner instead of the request form.
  // See: https://github.com/jperner11/NutrigoalApp/issues/<tbd>
  test.fixme(
    '/reset-password without a token shows an email-request form',
    async ({ page }) => {
      await page.goto('/reset-password', { waitUntil: 'networkidle' })
      // Expect an email input and a "Send reset link" (or similar) button.
      await expect(
        page.getByRole('textbox', { name: /email/i }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /send|reset|request/i }),
      ).toBeVisible()
    },
  )
})
