'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { aggregateIngredients, groupByCategory, CATEGORY_ORDER } from '@/lib/grocery'
import type { GroceryItem } from '@/lib/grocery'

interface MealFoods {
  _meta?: unknown
  items?: { name: string; amount: number; unit: string }[]
}

export default function GroceryPage() {
  const { profile } = useUser()
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [planName, setPlanName] = useState('')

  useEffect(() => {
    if (!profile) return
    loadGroceryList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadGroceryList() {
    const supabase = createClient()

    // Get active diet plan
    const { data: plans } = await supabase
      .from('diet_plans')
      .select('id, name')
      .eq('user_id', profile!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0) {
      setLoading(false)
      return
    }

    setPlanName(plans[0].name)

    // Get all meals for this plan (all 7 days)
    const { data: meals } = await supabase
      .from('diet_plan_meals')
      .select('foods, day_of_week')
      .eq('diet_plan_id', plans[0].id)

    if (!meals || meals.length === 0) {
      setLoading(false)
      return
    }

    // Group ingredients by day
    const ingredientsByDay: { name: string; amount: number; unit: string }[][] = []

    // Group meals by day_of_week
    const dayMap = new Map<number, typeof meals>()
    for (const meal of meals) {
      const day = meal.day_of_week ?? 0
      if (!dayMap.has(day)) dayMap.set(day, [])
      dayMap.get(day)!.push(meal)
    }

    for (const [, dayMeals] of dayMap) {
      const dayIngredients: { name: string; amount: number; unit: string }[] = []

      for (const meal of dayMeals) {
        const foods = meal.foods as MealFoods
        const items = foods?.items ?? (Array.isArray(foods) ? foods : [])

        for (const item of items as { name: string; amount: number; unit: string }[]) {
          if (item.name) {
            dayIngredients.push({
              name: item.name,
              amount: Number(item.amount) || 0,
              unit: item.unit || 'g',
            })
          }
        }
      }

      ingredientsByDay.push(dayIngredients)
    }

    const aggregated = aggregateIngredients(ingredientsByDay)
    setGroceryItems(aggregated)
    setLoading(false)
  }

  function toggleCheck(key: string) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  if (loading) return <div className="text-[var(--muted)]">Loading...</div>

  if (groceryItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <ShoppingCart className="h-12 w-12 text-[var(--muted-soft)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">No Grocery List</h2>
        <p className="text-[var(--muted)]">
          You need an active meal plan to generate a grocery list. Create or activate a diet plan first.
        </p>
      </div>
    )
  }

  const grouped = groupByCategory(groceryItems)
  const totalItems = groceryItems.length
  const checkedCount = checkedItems.size

  function formatAmount(amount: number): string {
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}kg`
    return `${Math.round(amount)}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Grocery List</h1>
        <p className="text-[var(--muted)] mt-1">
          Weekly shopping list from <span className="font-medium">{planName}</span>
        </p>
      </div>

      {/* Progress */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--muted)]">
            {checkedCount} of {totalItems} items checked
          </span>
          {checkedCount > 0 && (
            <button
              onClick={() => setCheckedItems(new Set())}
              className="text-xs text-[var(--acc-text)] hover:underline font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--acc)] rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Grocery Sections */}
      <div className="space-y-4">
        {CATEGORY_ORDER.filter(cat => grouped[cat]?.length > 0).map(category => {
          const items = grouped[category]
          const isCollapsed = collapsedCategories.has(category)
          const categoryChecked = items.filter(i => checkedItems.has(`${i.name}|${i.unit}`)).length
          const panelId = `grocery-cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

          return (
            <div key={category} className="card overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                aria-expanded={!isCollapsed}
                aria-controls={panelId}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--ink-2)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-[var(--foreground)]">{category}</h3>
                  <span className="text-xs text-[var(--muted-soft)] bg-[var(--line)] px-2 py-0.5 rounded-full">
                    {categoryChecked}/{items.length}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[var(--muted-soft)]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[var(--muted-soft)]" />
                )}
              </button>

              {!isCollapsed && (
                <div id={panelId} className="border-t border-[var(--line)]">
                  {items.map(item => {
                    const key = `${item.name}|${item.unit}`
                    const isChecked = checkedItems.has(key)

                    return (
                      <button
                        key={key}
                        onClick={() => toggleCheck(key)}
                        role="checkbox"
                        aria-checked={isChecked}
                        className={`w-full flex items-center gap-3 px-5 py-3 border-b border-[var(--line)] last:border-b-0 transition-colors text-left ${
                          isChecked ? 'bg-[var(--success-bg)]' : 'hover:bg-[var(--ink-2)]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[var(--ok)] border-[var(--ok)]'
                            : 'border-[var(--line-strong)]'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`flex-1 text-sm ${isChecked ? 'line-through text-[var(--muted-soft)]' : 'text-[var(--foreground)]'}`}>
                          {item.name}
                        </span>
                        <span className={`text-sm font-medium ${isChecked ? 'text-[var(--muted-soft)]' : 'text-[var(--muted)]'}`}>
                          {formatAmount(item.totalAmount)}{item.unit}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
