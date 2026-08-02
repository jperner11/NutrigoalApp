import { test, expect } from '../fixtures'

// Tester-feedback pipeline: sidebar entry point → /feedback form → row saved
// (migration 062) → thank-you state. Real POST /api/feedback, no mocking.

test('a client can send feedback from the app', async ({ clientPage }) => {
  await clientPage.goto('/feedback')
  await expect(clientPage.getByLabel('Your feedback')).toBeVisible()

  await clientPage
    .getByLabel('Your feedback')
    .fill('E2E test feedback — the onboarding felt smooth, sending this from the spec.')
  await clientPage.getByRole('button', { name: /send feedback/i }).click()

  await expect(clientPage.getByText(/got it — thank you/i)).toBeVisible({ timeout: 10_000 })
})
