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

  if (loading) return <div className="text-gray-500">Loading...</div>

  if (groceryItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Grocery List</h2>
        <p className="text-gray-500">
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
    return `${Math.round(amount)}${amount < 10 ? '' : ''}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grocery List</h1>
        <p className="text-gray-600 mt-1">
          Weekly shopping list from <span className="font-medium">{planName}</span>
        </p>
      </div>

      {/* Progress */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {checkedCount} of {totalItems} items checked
          </span>
          {checkedCount > 0 && (
            <button
              onClick={() => setCheckedItems(new Set())}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
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

          return (
            <div key={category} className="card overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{category}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {categoryChecked}/{items.length}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {!isCollapsed && (
                <div className="border-t border-gray-100">
                  {items.map(item => {
                    const key = `${item.name}|${item.unit}`
                    const isChecked = checkedItems.has(key)

                    return (
                      <button
                        key={key}
                        onClick={() => toggleCheck(key)}
                        className={`w-full flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-b-0 transition-colors text-left ${
                          isChecked ? 'bg-green-50/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`flex-1 text-sm ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {item.name}
                        </span>
                        <span className={`text-sm font-medium ${isChecked ? 'text-gray-300' : 'text-gray-500'}`}>
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
