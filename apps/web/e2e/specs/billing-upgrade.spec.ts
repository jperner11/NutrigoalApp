import { test, expect } from '../fixtures'

// Deterministic spec for F60 — "Upgrade tier (Stripe test mode)".
//
// The e2e/CI environment has no STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET /
// STRIPE_PRICE_* configured (see .github/workflows/e2e.yml — only E2E_SUPABASE_*
// vars are passed), so a real Stripe Checkout session can't be created and a real
// webhook can't be signed. Real hosted Stripe Checkout is also an external
// checkout.stripe.com navigation, which this suite avoids entirely (same class of
// risk as the browser→external-HTTPS proxy issue in #57).
//
// So this spec mocks POST /api/stripe/checkout (and the destination redirect
// itself, so the browser never leaves localhost) to verify the app's own
// checkout-initiation logic: clicking a paid tier's CTA calls the checkout API
// with the right plan and follows the returned session URL. The
// webhook-driven tier flip (checkout.session.completed → user_profiles.role)
// is real, unmockable server logic that needs Stripe test-mode secrets
// provisioned in CI to exercise for real — tracked separately.

test('F60 (smoke): /pricing renders paid tiers with upgrade CTAs for a free client', async ({
  clientPage,
}) => {
  await clientPage.goto('/pricing', { waitUntil: 'networkidle' })

  await expect(clientPage.getByRole('button', { name: /start 7-day trial/i })).toBeVisible()
  await expect(clientPage.getByRole('button', { name: /choose unlimited/i })).toBeVisible()
})

test('F60 (e2e): choosing Unlimited calls the checkout API and follows the returned session URL', async ({
  clientPage,
}) => {
  const fakeSessionUrl = `${clientPage.url() || 'http://localhost:3000'}/e2e-mock-stripe-session`

  let checkoutRequestBody: unknown = null
  await clientPage.route('**/api/stripe/checkout', async (route) => {
    checkoutRequestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: fakeSessionUrl }),
    })
  })
  // Stand in for Stripe's hosted checkout page so the browser never makes a
  // real request to checkout.stripe.com.
  await clientPage.route('**/e2e-mock-stripe-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>e2e-mock-stripe-checkout</body></html>',
    })
  })

  await clientPage.goto('/pricing', { waitUntil: 'networkidle' })
  await clientPage.getByRole('button', { name: /choose unlimited/i }).click()

  await expect(clientPage).toHaveURL(/e2e-mock-stripe-session/, { timeout: 15_000 })
  await expect.poll(() => checkoutRequestBody).toEqual({ plan: 'unlimited' })
})
