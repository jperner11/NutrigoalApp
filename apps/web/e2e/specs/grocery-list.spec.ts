import { test, expect } from '../fixtures'
import { seedActiveDietPlan } from '../lib/seed'

// Deterministic spec for the /grocery page — the shopping-list view aggregated
// from a client's active diet plan. Untested before this spec: no seed helper
// or spec previously existed for it.
//
// Strategy: seed a free client with an active one-day diet plan containing a
// single ingredient (bypassing the "New Diet Plan" builder UI, same approach
// as seedTrainingDay for /training), then confirm the aggregated list renders
// with the right category/amount and that checking an item off updates the
// progress counter.

test('grocery list renders from the active diet plan and items can be checked off', async ({
  client,
  clientPage,
}) => {
  test.setTimeout(60_000)

  await seedActiveDietPlan(client.id, 'E2E Diet Plan')

  await clientPage.goto('/grocery', { waitUntil: 'networkidle' })

  await expect(clientPage.getByRole('heading', { name: 'Grocery List' })).toBeVisible()
  await expect(clientPage.getByText('E2E Diet Plan')).toBeVisible()

  // Seeded ingredient (200g Chicken Breast) categorizes under "Protein" and
  // shows its aggregated amount next to the item.
  await expect(clientPage.getByRole('heading', { name: 'Protein' })).toBeVisible()
  await expect(clientPage.getByText('0 of 1 items checked')).toBeVisible()

  const item = clientPage.getByRole('checkbox', { name: /chicken breast/i })
  await expect(item).toBeVisible()
  await expect(item).toHaveAttribute('aria-checked', 'false')
  await expect(clientPage.getByText('200g')).toBeVisible()

  // Check the item off — progress counter and checkbox state both update.
  await item.click()
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await expect(clientPage.getByText('1 of 1 items checked')).toBeVisible()
})
