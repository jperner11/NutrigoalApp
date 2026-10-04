import { test, expect } from '../fixtures'

// Deterministic spec for the Settings > Profile flow — previously untested.
// Settings feeds calculateNutritionTargets (via handleSave), so a silent save
// failure here would ship undetected. Free clients see the Profile tab with
// no role upgrade needed, so clientPage is enough.

test('client updates and persists their profile name', async ({ clientPage: page }) => {
  test.setTimeout(60_000)

  await page.goto('/settings', { waitUntil: 'networkidle' })

  const nameInput = page.getByLabel('Full Name')
  await expect(nameInput).toBeVisible()
  await nameInput.fill('Updated Test Name')

  await page.getByRole('button', { name: /save changes/i }).click()

  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 15_000 })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(page.getByLabel('Full Name')).toHaveValue('Updated Test Name')
})
