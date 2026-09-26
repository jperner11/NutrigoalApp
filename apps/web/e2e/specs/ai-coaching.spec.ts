import { test, expect } from '../fixtures'

// Deterministic spec for /ai/coaching — the AI Coaching Tools hub and its
// per-tool report page ([tool]/page.tsx), previously uncovered by any e2e
// spec. Mocks the OpenAI-backed POST /api/ai/coaching route so no real model
// call is made (cost-aware, matches generate-plans.spec.ts's strategy).

const MOCK_RESPONSE = 'E2E mock recovery report: prioritise 8 hours of sleep and a deload every 6th week.'

test('client opens the Recovery Protocol tool and gets a coaching report (AI route mocked)', async ({
  clientPage: page,
}) => {
  test.setTimeout(60_000)

  await page.route('**/api/ai/coaching', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: MOCK_RESPONSE }),
    })
  })

  await page.goto('/ai/coaching', { waitUntil: 'networkidle' })

  // Hub lists all three tools.
  await expect(page.getByRole('link', { name: /recovery protocol/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /injury prevention/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /body recomposition/i })).toBeVisible()

  await page.getByRole('link', { name: /recovery protocol/i }).click()
  await expect(page).toHaveURL(/\/ai\/coaching\/recovery/)

  await page.getByRole('button', { name: /get my recovery protocol/i }).click()

  // Report renders with the mocked response and follow-up actions.
  await expect(page.getByText(MOCK_RESPONSE)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /run again/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /try another tool/i })).toBeVisible()
})
