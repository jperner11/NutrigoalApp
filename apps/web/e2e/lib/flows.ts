import { expect, type Page } from '@playwright/test'

// Reusable, selector-resilient flows shared across specs. These deliberately avoid
// hard-coding every field of the multi-step wizards (which change often); instead
// they satisfy each step generically and assert the meaningful end state.

const ADVANCE = /continue|finish|complete|done|next/i

/**
 * Complete the onboarding wizard for whichever role is logged in (coach = 6 steps,
 * client = 9 steps). Strategy per step: fill text/number inputs with realistic
 * values, then click option buttons until the advance button enables, then advance.
 * On the final step it prefers an explicit "Go to Dashboard" (clients) and never
 * clicks "Generate AI Plans" (which would burn AI credits). Ends on /dashboard.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto('/onboarding', { waitUntil: 'networkidle' })
  // Let React hydrate before interacting — clicking toggle buttons before their
  // onClick handlers attach silently no-ops (same race as the login form).
  await page.getByRole('button', { name: /continue|next/i }).first().waitFor({ state: 'visible' })
  await page.waitForTimeout(2500)

  for (let step = 0; step < 16; step++) {
    if (!/\/onboarding/.test(page.url())) break
    await page.waitForTimeout(700)

    // Final-step shortcut: skip AI generation, just go to the dashboard.
    const toDashboard = page.getByRole('button', { name: /go to dashboard/i })
    if ((await toDashboard.count()) && (await toDashboard.first().isEnabled().catch(() => false))) {
      await toDashboard.first().click()
      break
    }

    // Fill any text inputs / textareas / number fields on this step.
    for (const el of await page.locator('main input, main textarea').all()) {
      const type = await el.getAttribute('type').catch(() => null)
      if (type === 'checkbox' || type === 'radio') continue
      await el.fill(type === 'number' ? '5' : 'Sample answer for testing').catch(() => {})
    }

    const advance = () => page.getByRole('button', { name: ADVANCE }).last()

    // Click option buttons (toggles) until the advance button becomes enabled.
    // Collect the option labels up front, then click each via a FRESH exact-name
    // locator (index-based nth() handles go stale across React re-renders and the
    // clicks silently no-op). Click one at a time and stop as soon as the step is
    // satisfied so we don't toggle a single-select group back off.
    const optionLabels = (await page.locator('main button').allInnerTexts())
      .map((t) => t.trim())
      .filter((l) => l !== '' && !ADVANCE.test(l) && !/back|←|→|generate/i.test(l))

    for (const label of optionLabels) {
      if (!(await advance().isDisabled().catch(() => true))) break
      await page.getByRole('button', { name: label, exact: true }).first().click().catch(() => {})
      await page.waitForTimeout(150)
    }

    if (await advance().isDisabled().catch(() => true)) {
      throw new Error(`Onboarding stuck on a step with the advance button disabled (step ${step + 1})`)
    }
    await advance().click().catch(() => {})
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
}

export interface PublishedCoach {
  slug: string
}

/**
 * Publish the logged-in coach's public marketplace profile via Settings → Marketplace.
 * Toggles "Show me in Discover", fills headline + bio + a starting price, and saves.
 * Returns the generated profile slug (used to visit /find-coach/<slug>).
 */
export async function publishCoachProfile(
  page: Page,
  opts: { headline?: string; bio?: string; priceFrom?: string } = {},
): Promise<PublishedCoach> {
  const headline = opts.headline ?? 'Fat loss coaching for busy professionals'
  const bio = opts.bio ?? 'I help busy people lose fat with sustainable training and nutrition.'

  await page.goto('/settings', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Marketplace' }).click()
  await expect(page.getByRole('heading', { name: /coach marketplace profile/i })).toBeVisible()
  // Wait for the marketplace form (incl. the generated slug field) to render.
  await expect(page.getByText('Profile slug')).toBeVisible()

  // Capture the auto-generated slug from the disabled slug field. Poll, since the
  // value is populated client-side just after the tab renders.
  let slug: string | undefined
  await expect(async () => {
    slug = await page
      .locator('input[disabled]')
      .evaluateAll((els) => (els as HTMLInputElement[]).map((e) => e.value).find((v) => /^coach-/.test(v)))
    expect(slug).toBeTruthy()
  }).toPass({ timeout: 20_000 })

  await page.getByRole('checkbox', { name: /show me in discover/i }).check()
  await page.getByRole('textbox', { name: /Helping busy professionals/i }).fill(headline)
  await page.getByRole('textbox', { name: /What kind of clients you help/i }).fill(bio)
  await page
    .getByText('Price from')
    .locator('xpath=following::input[1]')
    .fill(opts.priceFrom ?? '100')
    .catch(() => {})

  await page.getByRole('button', { name: /save marketplace profile/i }).click()
  await page.waitForTimeout(1500)

  return { slug }
}

/** Submit a verification request from the Marketplace tab (leaves status pending). */
export async function requestVerification(page: Page, link = 'https://example.com/my-cert'): Promise<void> {
  await page.getByRole('textbox', { name: /REPS \/ PT diploma/i }).fill(link)
  await page.getByRole('button', { name: /request verification/i }).click()
  await page.waitForTimeout(1000)
}
