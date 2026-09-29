import { test, expect } from '../fixtures'

// Settings > Account > support request flow: form submit → real INSERT into
// support_requests (migration 023) → toast confirmation → item appears in
// the "Recent support requests" list. Real Supabase write, no mocking.

test('a client can submit a support request from Settings', async ({ clientPage }) => {
  await clientPage.goto('/settings')

  await clientPage.getByRole('button', { name: 'Account', exact: true }).click()
  await expect(clientPage.getByRole('heading', { name: 'Report an issue' })).toBeVisible()

  const subject = `E2E support request ${Date.now()}`
  await clientPage.getByLabel('Subject').fill(subject)
  await clientPage
    .getByLabel('Message')
    .fill('E2E test support request — sending this from the settings spec.')

  await clientPage.getByRole('button', { name: /submit report/i }).click()

  await expect(clientPage.getByText(/support request submitted/i)).toBeVisible({ timeout: 10_000 })
  await expect(clientPage.getByText(subject)).toBeVisible()
})
