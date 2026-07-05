import { test, expect } from '../fixtures'
import { completeClientOnboarding } from '../lib/flows'

// Deterministic version of the F11 flow: "Generate AI plan from intake".
// Strategy: complete client onboarding (so the profile has daily_calories /
// daily_protein), then navigate to /generate-plans with all three AI routes
// intercepted by mock responses. No real OpenAI calls are made — cost-aware.

const MOCK_TRAINING_PLAN = {
  name: 'E2E Test Training Plan',
  description: 'Mock plan for automated testing',
  days: [
    {
      day_number: 1,
      name: 'Day 1 — Full Body',
      exercises: [
        {
          name: 'Push-up',
          body_part: 'chest',
          equipment: 'bodyweight',
          sets: 3,
          reps: '10-12',
          rest_seconds: 60,
        },
      ],
    },
  ],
}

const MOCK_MEAL_DAY = {
  meals: [
    {
      meal_type: 'breakfast',
      title: 'E2E Oats & Eggs',
      time: '08:00',
      ingredients: [
        { name: 'Oats', amount: 80, unit: 'g', calories: 300, protein: 10, carbs: 50, fat: 6 },
      ],
      calories: 300,
      protein: 10,
      carbs: 50,
      fat: 6,
    },
  ],
}

const MOCK_COMPANION = {
  personal_rules: ['Eat protein with every meal'],
  timeline: '8-12 weeks',
  hydration_tips: ['Drink water consistently throughout the day'],
  hydration_explanation: 'Hydration supports performance and recovery.',
  snack_swaps: [],
  supplement_note: 'No specific supplements required at this stage.',
}

test('F11: /generate-plans page auto-generates and saves a plan (AI routes mocked)', async ({
  clientPage,
}) => {
  test.setTimeout(180_000)

  // Step 1 — complete onboarding so the profile has daily_calories / daily_protein.
  await completeClientOnboarding(clientPage)
  await expect(clientPage).toHaveURL(/\/dashboard/)

  // Step 2 — intercept all three AI routes before navigating.
  await clientPage.route('**/api/ai/generate-training-plan', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRAINING_PLAN) })
  })
  await clientPage.route('**/api/ai/generate-meal-plan', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MEAL_DAY) })
  })
  await clientPage.route('**/api/ai/meal-plan-companion', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COMPANION) })
  })

  // Step 3 — navigate to /generate-plans; the page auto-fires generation.
  await clientPage.goto('/generate-plans', { waitUntil: 'networkidle' })

  // Step 4 — assert the success state renders (all four steps complete).
  // Timeout is generous because the page makes 9 mocked round-trips plus DB writes.
  await expect(clientPage.getByRole('heading', { name: /your plans are ready/i })).toBeVisible({
    timeout: 90_000,
  })

  // At least one saved-plan shortcut link should be visible.
  const planLinks = clientPage.getByRole('link', { name: /meal plan|training plan|supplement/i })
  await expect(planLinks.first()).toBeVisible({ timeout: 10_000 })
})
