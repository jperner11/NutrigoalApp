import { test, expect } from '../fixtures'
import { seedTrainingDay } from '../lib/seed'

// Deterministic spec for F13 — "Log a workout" (free-tier client,
// /training/session/[dayId]). Strategy:
//   1. Seed a one-day training plan with a single exercise directly via the
//      admin API (seedTrainingDay) — this skips the "New Training Plan"
//      builder UI (a separate flow) and lets this spec focus on logging a
//      session against an existing plan day.
//   2. Log in as a seeded free client and go straight to the session page.
//   3. Fill weight/reps for each set, mark all sets complete, finish the
//      workout, and assert the redirect to /training.

test('F13 (e2e): log sets for a workout session and finish → /training', async ({
  clientPage,
  client,
}) => {
  test.setTimeout(120_000)

  const { planDayId } = await seedTrainingDay(client.id)

  await clientPage.goto(`/training/session/${planDayId}`, { waitUntil: 'networkidle' })

  await expect(clientPage.getByRole('heading', { name: 'Bench Press' })).toBeVisible()
  await expect(clientPage.getByText('Exercise 1 of 1')).toBeVisible()

  const setRows = clientPage.locator('div.grid-cols-\\[48px_1fr_1fr_56px\\]').filter({
    has: clientPage.locator('input[type="number"]'),
  })
  const setCount = await setRows.count()
  expect(setCount).toBeGreaterThan(0)

  for (let i = 0; i < setCount; i++) {
    const row = setRows.nth(i)
    const inputs = row.locator('input[type="number"]')
    await inputs.nth(0).fill('60')
    await inputs.nth(1).fill('10')
    await row.getByRole('button').click()
  }

  const finishBtn = clientPage.getByRole('button', { name: /finish workout/i })
  await expect(finishBtn).toBeVisible()
  await finishBtn.click()

  await expect(clientPage).toHaveURL(/\/training$/, { timeout: 30_000 })
})
