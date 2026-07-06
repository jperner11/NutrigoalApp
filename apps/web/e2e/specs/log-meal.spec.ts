import { test, expect } from '../fixtures'

// Deterministic spec for F12 — "Log a meal" (free-tier client, /diet/new).
// Strategy:
//   1. Log in as a seeded free client (no onboarding needed — the page falls
//      back to default macro targets, and middleware never gates /diet/new).
//   2. Mock /api/food/search with a local-source result so no Spoonacular /
//      OpenFoodFacts call is made. Local-source items also skip the separate
//      /api/food/nutrition round-trip (macros are computed inline from the
//      per-100g values stored on the result).
//   3. Add a meal, search for a food, add it, save — assert redirect to /diet.

const MOCK_FOOD_SEARCH = {
  results: [
    {
      id: 'e2e-chicken-breast',
      name: 'Chicken Breast (cooked)',
      source: 'local',
      calories_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fat_per_100g: 3.6,
      default_amount: 150,
      default_unit: 'g',
    },
  ],
}

test('F12 (smoke): /diet/new renders and is gated for free tier', async ({
  clientPage,
}) => {
  test.setTimeout(120_000)
  await clientPage.goto('/diet/new', { waitUntil: 'networkidle' })

  await expect(clientPage.getByText('PLAN DETAILS')).toBeVisible()
  await expect(clientPage.getByPlaceholder('e.g. My Cutting Plan')).toBeVisible()
  // Free tier: AI generator locked (no ai_suggestions tier access)
  await expect(clientPage.getByRole('link', { name: /upgrade to pro/i })).toBeVisible()
  await expect(clientPage.getByRole('button', { name: /add meal/i })).toBeVisible()
  // Save is disabled until at least one meal is added
  await expect(clientPage.getByRole('button', { name: /save diet plan/i })).toBeDisabled()
})

test('F12 (e2e): add a meal with a food item and save → /diet', async ({
  clientPage,
}) => {
  test.setTimeout(180_000)

  // Intercept food search to avoid external APIs.
  await clientPage.route('**/api/food/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_FOOD_SEARCH),
    })
  })

  await clientPage.goto('/diet/new', { waitUntil: 'networkidle' })

  // Fill plan name
  await clientPage.getByPlaceholder('e.g. My Cutting Plan').fill('E2E Meal Plan')

  // Add a blank meal
  await clientPage.getByRole('button', { name: /add meal/i }).click()
  await expect(clientPage.getByRole('button', { name: /add food/i })).toBeVisible()

  // Open food search panel
  await clientPage.getByRole('button', { name: /add food/i }).click()
  await expect(clientPage.getByPlaceholder(/search foods/i)).toBeVisible()

  // Search and select the mocked food
  await clientPage.getByPlaceholder(/search foods/i).fill('chicken')
  await clientPage.getByRole('button', { name: /^search$/i }).click()
  await expect(
    clientPage.getByRole('button', { name: /chicken breast/i }),
  ).toBeVisible({ timeout: 10_000 })
  await clientPage.getByRole('button', { name: /chicken breast/i }).click()

  // Food appears in ingredient list (150 g default_amount from mock)
  await expect(
    clientPage.getByText('150 g Chicken Breast (cooked)'),
  ).toBeVisible({ timeout: 10_000 })

  // Save plan and assert redirect to /diet
  const saveBtn = clientPage.getByRole('button', { name: /save diet plan/i })
  await expect(saveBtn).toBeEnabled()
  await saveBtn.click()
  await expect(clientPage).toHaveURL(/\/diet$/, { timeout: 30_000 })
})
