import { test, expect, loginAs } from '../fixtures'
import { upgradeUserRole } from '../lib/seed'

// Deterministic spec for F61 — "Tier boundaries after upgrade/downgrade". F14
// already proved a free user is locked out of Pro surfaces, and F15/F16 proved a
// Pro user has access — but nothing yet proved the gate re-evaluates live when a
// role actually CHANGES mid-session, which is the real-world shape of both an
// upgrade (Stripe checkout completes) and a downgrade (subscription cancelled /
// expired, driven by the webhook route's `customer.subscription.deleted` handler).
// `useUser()` re-fetches the profile on every mount, so a full navigation after
// the role flips is enough to exercise that live re-evaluation for real — no UI
// changes needed, no Stripe required (role is flipped directly, same technique
// F15/F16 already use to reach Pro deterministically).

test('F61 (e2e): cardio + supplements gates re-lock and re-unlock as the role changes', async ({
  client,
  page,
}) => {
  test.setTimeout(60_000)

  await loginAs(page, client)

  // Starts free: locked on both Pro-only surfaces.
  await page.goto('/cardio', { waitUntil: 'networkidle' })
  await expect(page.getByText(/cardio tracking is on pro/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /upgrade to pro/i }).first()).toBeVisible()

  await page.goto('/supplements', { waitUntil: 'networkidle' })
  await expect(page.getByText(/supplement tracking is a pro tool/i)).toBeVisible()

  // Upgrade (simulating a completed Stripe checkout): both surfaces unlock on the
  // very next navigation, same logged-in session, no re-login.
  await upgradeUserRole(client.id, 'pro')

  await page.goto('/cardio', { waitUntil: 'networkidle' })
  await expect(page.getByText(/cardio tracking is on pro/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /log session/i })).toBeVisible()

  await page.goto('/supplements', { waitUntil: 'networkidle' })
  await expect(page.getByText(/supplement tracking is a pro tool/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add supplement/i })).toBeVisible()

  // Downgrade (simulating cancellation/expiry): both surfaces re-lock on the next
  // navigation. This is the direction no prior spec covered.
  await upgradeUserRole(client.id, 'free')

  await page.goto('/cardio', { waitUntil: 'networkidle' })
  await expect(page.getByText(/cardio tracking is on pro/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /upgrade to pro/i }).first()).toBeVisible()

  await page.goto('/supplements', { waitUntil: 'networkidle' })
  await expect(page.getByText(/supplement tracking is a pro tool/i)).toBeVisible()
})
