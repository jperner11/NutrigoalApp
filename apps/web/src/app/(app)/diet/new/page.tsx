'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Utensils, Sparkles, Plus, Trash2, ArrowLeft, Loader2, RefreshCw, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { MEAL_TYPES } from '@/lib/constants'
import type { FoodItem, MealType } from '@/lib/supabase/types'
import { canAccess } from '@/lib/tierUtils'
import { isManagedClientRole } from '@nutrigoal/shared'
import { AppHeroPanel, ListCard, MetricCard } from '@/components/ui/AppDesign'
import { apiFetch, ApiError } from '@/lib/apiClient'

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

const MAX_REROLLS = 3

export default function NewDietPlanPage() {
  const router = useRouter()
  const { profile } = useUser()
  const [planName, setPlanName] = useState('')
  const [notes, setNotes] = useState('')
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; source: string; external_id?: string; calories_per_100g?: number; protein_per_100g?: number; carbs_per_100g?: number; fat_per_100g?: number; default_amount?: number; default_unit?: string }>>([])
  const [searching, setSearching] = useState(false)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [foodAmount, setFoodAmount] = useState(100)
  const [includeSnack, setIncludeSnack] = useState(false)
  const [rerollsUsed, setRerollsUsed] = useState(0)
  const [rerollingMeal, setRerollingMeal] = useState<number | null>(null)
  const [mealPrefs, setMealPrefs] = useState({
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: '',
  })

  useEffect(() => {
    if (profile && isManagedClientRole(profile.role)) {
      router.replace('/diet')
    }
  }, [profile, router])

  if (!profile || isManagedClientRole(profile.role)) return null

  const targetCalories = profile.daily_calories ?? 2000
  const targetProtein = profile.daily_protein ?? 150
  const targetCarbs = profile.daily_carbs ?? 250
  const targetFat = profile.daily_fat ?? 65

  const mealSlots = [
    { key: 'breakfast', label: 'Breakfast', type: 'breakfast' as MealType, share: includeSnack ? 0.25 : 0.25 },
    { key: 'lunch', label: 'Lunch', type: 'lunch' as MealType, share: includeSnack ? 0.35 : 0.40 },
    { key: 'dinner', label: 'Dinner', type: 'dinner' as MealType, share: includeSnack ? 0.30 : 0.35 },
    ...(includeSnack ? [{ key: 'snack', label: 'Afternoon Snack', type: 'snack' as MealType, share: 0.10 }] : []),
  ]

  async function searchFood(query: string) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<{ results?: Array<{ id: string; name: string; source: string }> }>(
        `/api/food/search?query=${encodeURIComponent(query)}&number=8`,
        { context: { feature: 'diet-new', action: 'search-food', extra: { query } } },
      )
      setSearchResults((data?.results ?? []) as typeof searchResults)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to search foods')
    }
    setSearching(false)
  }

  async function addFoodToMeal(mealIndex: number, food: { id: string; name: string; source: string; external_id?: string; calories_per_100g?: number; protein_per_100g?: number; carbs_per_100g?: number; fat_per_100g?: number; default_amount?: number; default_unit?: string }) {
    setLoadingNutrition(true)
    try {
      const amt = food.default_amount ?? foodAmount
      let foodItem: FoodItem

      if (food.source === 'local' && food.calories_per_100g !== undefined) {
        const scale = amt / 100
        foodItem = {
          food_id: food.id, source: 'custom', name: food.name, amount: amt, unit: food.default_unit ?? 'g',
          calories: Math.round((food.calories_per_100g ?? 0) * scale),
          protein: Math.round((food.protein_per_100g ?? 0) * scale * 10) / 10,
          carbs: Math.round((food.carbs_per_100g ?? 0) * scale * 10) / 10,
          fat: Math.round((food.fat_per_100g ?? 0) * scale * 10) / 10,
        }
      } else {
        const sourceParam = food.source === 'openfoodfacts' ? 'openfoodfacts' : 'spoonacular'
        const idParam = food.external_id ?? food.id
        const data = await apiFetch<{
          spoonacular_id?: number
          food_id?: string
          name?: string
          calories: number
          protein: number
          carbs: number
          fat: number
        }>(`/api/food/nutrition?id=${idParam}&amount=${amt}&unit=g&source=${sourceParam}`, {
          context: { feature: 'diet-new', action: 'get-nutrition', extra: { source: sourceParam } },
        })
        foodItem = {
          spoonacular_id: data.spoonacular_id, food_id: data.food_id,
          source: food.source === 'openfoodfacts' ? 'openfoodfacts' : 'spoonacular',
          name: data.name || food.name, amount: amt, unit: 'g',
          calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat,
        }
      }

      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex].foods.push(foodItem)
        updated[mealIndex].total_calories += foodItem.calories
        updated[mealIndex].total_protein += foodItem.protein
        updated[mealIndex].total_carbs += foodItem.carbs
        updated[mealIndex].total_fat += foodItem.fat
        return updated
      })

      toast.success(`Added ${food.name}`)
      setSearchQuery('')
      setSearchResults([])
    } catch {
      toast.error('Failed to get nutrition data')
    }
    setLoadingNutrition(false)
  }

  function removeFoodFromMeal(mealIndex: number, foodIndex: number) {
    setMeals(prev => {
      const updated = [...prev]
      const food = updated[mealIndex].foods[foodIndex]
      updated[mealIndex].total_calories -= food.calories
      updated[mealIndex].total_protein -= food.protein
      updated[mealIndex].total_carbs -= food.carbs
      updated[mealIndex].total_fat -= food.fat
      updated[mealIndex].foods.splice(foodIndex, 1)
      return updated
    })
  }

  function addMeal() {
    setMeals(prev => [
      ...prev,
      {
        meal_type: 'snack' as MealType,
        meal_name: `Meal ${prev.length + 1}`,
        foods: [],
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      },
    ])
  }

  interface APIIngredient {
    name: string
    amount: number
    unit: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }

  interface APIMeal {
    title: string
    ingredients: APIIngredient[]
    calories: number
    protein: number
    carbs: number
    fat: number
  }

  function apiMealToEntry(meal: APIMeal, slot: { type: MealType; label: string }): MealEntry {
    const foods: FoodItem[] = meal.ingredients.map((ing: APIIngredient) => ({
      source: 'ai_parsed' as const,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit || 'g',
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
    }))

    return {
      meal_type: slot.type,
      meal_name: `${slot.label}: ${meal.title}`,
      foods,
      total_calories: meal.calories,
      total_protein: meal.protein,
      total_carbs: meal.carbs,
      total_fat: meal.fat,
    }
  }

  async function generatePlan() {
    setGenerating(true)
    try {
      const params = new URLSearchParams({
        targetCalories: String(targetCalories),
        targetProtein: String(targetProtein),
        targetCarbs: String(targetCarbs),
        targetFat: String(targetFat),
        mealCount: String(mealSlots.length),
      })

      mealSlots.forEach(slot => {
        const ingredients = mealPrefs[slot.key as keyof typeof mealPrefs]?.trim()
        if (ingredients) {
          params.append(`ingredients_${slot.key}`, ingredients)
        }
      })

      const data = await apiFetch<{ meals: APIMeal[] }>(`/api/food/mealplan?${params.toString()}`, {
        context: { feature: 'diet-new', action: 'generate-plan' },
      })

      const generatedMeals: MealEntry[] = data.meals.map(
        (meal: APIMeal, index: number) => {
          const slot = mealSlots[index]
          return apiMealToEntry(meal, slot)
        }
      )

      setMeals(generatedMeals)
      setRerollsUsed(0)
      setPlanName(`${profile?.full_name?.split(' ')[0] || 'My'}'s Meal Plan`)
      toast.success('Meal plan generated with ingredient breakdowns!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate meal plan. Try again.')
    }
    setGenerating(false)
  }

  async function rerollMeal(mealIndex: number) {
    if (rerollsUsed >= MAX_REROLLS) {
      toast.error(`You've used all ${MAX_REROLLS} surprise re-rolls for this plan.`)
      return
    }

    const slot = mealSlots[mealIndex]
    if (!slot) return

    setRerollingMeal(mealIndex)
    try {
      const mealCalories = Math.round(targetCalories * slot.share)
      const mealProtein = Math.round(targetProtein * slot.share)
      const mealCarbs = Math.round(targetCarbs * slot.share)
      const mealFat = Math.round(targetFat * slot.share)

      const meal = await apiFetch<APIMeal>('/api/food/mealplan', {
        method: 'POST',
        body: {
          mealType: slot.key,
          targetCalories: mealCalories,
          targetProtein: mealProtein,
          targetCarbs: mealCarbs,
          targetFat: mealFat,
          ingredients: mealPrefs[slot.key as keyof typeof mealPrefs] || '',
        },
        context: { feature: 'diet-new', action: 'reroll-meal', extra: { mealType: slot.key } },
      })

      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex] = apiMealToEntry(meal, slot)
        return updated
      })

      setRerollsUsed(prev => prev + 1)
      toast.success(`New ${slot.label.toLowerCase()} generated!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate meal.')
    }
    setRerollingMeal(null)
  }

  async function savePlan() {
    if (!profile) return
    if (!planName.trim()) {
      toast.error('Please enter a plan name')
      return
    }
    if (meals.length === 0) {
      toast.error('Add at least one meal')
      return
    }

    setSaving(true)
    const supabase = createClient()

    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('user_id', profile.id)
      .eq('is_active', true)

    const { data: plan, error: planError } = await supabase
      .from('diet_plans')
      .insert({
        user_id: profile.id,
        created_by: profile.id,
        name: planName,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fat: targetFat,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single()

    if (planError || !plan) {
      toast.error('Failed to create plan')
      setSaving(false)
      return
    }

    const mealInserts = meals.map(meal => ({
      diet_plan_id: plan.id,
      day_of_week: null,
      meal_type: meal.meal_type,
      meal_name: meal.meal_name,
      foods: meal.foods,
      total_calories: Math.round(meal.total_calories),
      total_protein: Math.round(meal.total_protein),
      total_carbs: Math.round(meal.total_carbs),
      total_fat: Math.round(meal.total_fat),
    }))

    const { error: mealsError } = await supabase
      .from('diet_plan_meals')
      .insert(mealInserts)

    if (mealsError) {
      toast.error('Failed to save meals')
      setSaving(false)
      return
    }

    toast.success('Diet plan created!')
    router.push('/diet')
  }

  const totalCalories = meals.reduce((s, m) => s + m.total_calories, 0)
  const totalProtein = meals.reduce((s, m) => s + m.total_protein, 0)
  const totalCarbs = meals.reduce((s, m) => s + m.total_carbs, 0)
  const totalFat = meals.reduce((s, m) => s + m.total_fat, 0)

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-4">
        <Link href="/diet" className="btn btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to diet
        </Link>
      </div>

      <AppHeroPanel
        eyebrow="N° 02 · New plan"
        title="Plan,"
        accent="assembled."
        subtitle="Generate a meal plan or build one manually while keeping targets visible."
      />

      {/* Plan Name & Notes — FIRST */}
      <ListCard className="mb-6" eyebrow="PLAN DETAILS">
        <div className="space-y-4">
          <div>
            <label className="app-mono-label mb-2 block">Plan name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="input-field"
              placeholder="e.g. My Cutting Plan"
            />
          </div>
          <div>
            <label className="app-mono-label mb-2 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[92px]"
              rows={2}
              placeholder="Any notes about this plan..."
            />
          </div>
        </div>
      </ListCard>

      {/* Auto-Generate with Preferences */}
      {canAccess(profile.role, 'ai_suggestions') ? (
      <ListCard className="mb-8" eyebrow="AI GENERATOR" tone="accent">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[var(--brand-400)]" />
          <h3 className="font-semibold text-[var(--fg)]">Auto-generate plan</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--fg-2)]">
          Target: {targetCalories} cal · {targetProtein}g protein · {targetCarbs}g carbs · {targetFat}g fat. Tell us what ingredients you like for each meal.
        </p>

        <div className="space-y-3 mb-4">
          {[
            { key: 'breakfast', label: 'Breakfast', placeholder: 'e.g. eggs, oats, banana, yogurt' },
            { key: 'lunch', label: 'Lunch', placeholder: 'e.g. chicken, rice, broccoli, avocado' },
            { key: 'dinner', label: 'Dinner', placeholder: 'e.g. salmon, sweet potato, asparagus' },
          ].map(slot => (
            <div key={slot.key}>
              <label className="app-mono-label mb-2 block">{slot.label} ingredients</label>
              <input
                type="text"
                value={mealPrefs[slot.key as keyof typeof mealPrefs]}
                onChange={(e) => setMealPrefs(prev => ({ ...prev, [slot.key]: e.target.value }))}
                className="input-field"
                placeholder={slot.placeholder}
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIncludeSnack(!includeSnack)}
              className={`chip flex items-center gap-2 text-sm font-medium transition-colors ${
                includeSnack
                  ? 'border-[var(--brand-400)] bg-[var(--brand-100)] text-[var(--brand-400)]'
                  : ''
              }`}
            >
              <Plus className="h-3 w-3" />
              Afternoon Snack
            </button>
          </div>

          {includeSnack && (
            <div>
              <label className="app-mono-label mb-2 block">Snack ingredients</label>
              <input
                type="text"
                value={mealPrefs.snack}
                onChange={(e) => setMealPrefs(prev => ({ ...prev, snack: e.target.value }))}
                className="input-field"
                placeholder="e.g. nuts, protein bar, fruit, cheese"
              />
            </div>
          )}
        </div>

        <button
          onClick={generatePlan}
          disabled={generating}
          className="btn btn-accent w-full disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{generating ? 'Generating meals...' : 'Generate Meal Plan'}</span>
        </button>
      </ListCard>
      ) : (
      <ListCard className="mb-8" eyebrow="AI GENERATOR">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-[var(--fg-4)]" />
          <h3 className="font-semibold text-[var(--fg)]">Auto-generate plan</h3>
        </div>
        <p className="mb-3 text-sm text-[var(--fg-3)]">
          AI meal plan generation is a Pro feature. You can still manually build your plan below using the food search.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-400)]"
        >
          Upgrade to Pro
        </Link>
      </ListCard>
      )}

      {/* Macro Summary */}
      {meals.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Calories" value={Math.round(totalCalories)} footer={`/ ${targetCalories}`} tone={Math.abs(totalCalories - targetCalories) < targetCalories * 0.1 ? 'accent' : 'danger'} />
          <MetricCard label="Protein" value={Math.round(totalProtein)} unit="g" footer={`/ ${targetProtein}g`} tone={Math.abs(totalProtein - targetProtein) < targetProtein * 0.15 ? 'success' : 'danger'} />
          <MetricCard label="Carbs" value={Math.round(totalCarbs)} unit="g" footer={`/ ${targetCarbs}g`} tone={Math.abs(totalCarbs - targetCarbs) < targetCarbs * 0.15 ? 'warn' : 'danger'} />
          <MetricCard label="Fat" value={Math.round(totalFat)} unit="g" footer={`/ ${targetFat}g`} tone={Math.abs(totalFat - targetFat) < targetFat * 0.15 ? 'danger' : 'muted'} />
        </div>
      )}

      {/* Meals */}
      <div className="space-y-4 mb-6">
        {meals.map((meal, mealIndex) => (
          <div key={mealIndex} className="card overflow-hidden">
            {/* Meal Header */}
            <div className="border-b border-[var(--line)] bg-[var(--ink-2)] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--brand-100)] p-2">
                    <Utensils className="h-4 w-4 text-[var(--brand-400)]" />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={meal.meal_name}
                      onChange={(e) => {
                        setMeals(prev => {
                          const updated = [...prev]
                          updated[mealIndex].meal_name = e.target.value
                          return updated
                        })
                      }}
                      className="bg-transparent p-0 text-lg font-semibold text-[var(--fg)] outline-none"
                    />
                    <div className="flex gap-2 mt-0.5">
                      <select
                        value={meal.meal_type}
                        onChange={(e) => {
                          setMeals(prev => {
                            const updated = [...prev]
                            updated[mealIndex].meal_type = e.target.value as MealType
                            return updated
                          })
                        }}
                        className="bg-transparent p-0 text-xs text-[var(--fg-3)] outline-none"
                      >
                        {MEAL_TYPES.map(mt => (
                          <option key={mt.value} value={mt.value}>{mt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Surprise Me button */}
                  {mealIndex < mealSlots.length && (
                    <button
                      onClick={() => rerollMeal(mealIndex)}
                      disabled={rerollingMeal !== null || rerollsUsed >= MAX_REROLLS}
                      className="app-status-pill flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      title={rerollsUsed >= MAX_REROLLS ? 'No re-rolls left' : `${MAX_REROLLS - rerollsUsed} re-rolls remaining`}
                    >
                      {rerollingMeal === mealIndex ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Surprise me
                    </button>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--fg)]">{Math.round(meal.total_calories)} cal</p>
                    <p className="text-xs text-[var(--fg-3)]">
                      {Math.round(meal.total_protein)}P · {Math.round(meal.total_carbs)}C · {Math.round(meal.total_fat)}F
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredient List */}
            <div className="px-6 py-4">
              {meal.foods.length > 0 && (
                <div className="space-y-2 mb-4">
                  {/* Header row */}
                  <div className="app-mono-label grid grid-cols-12 gap-2 border-b border-[var(--line)] px-2 pb-2">
                    <div className="col-span-5">Ingredient</div>
                    <div className="col-span-2 text-right">Cal</div>
                    <div className="col-span-1 text-right">P</div>
                    <div className="col-span-1 text-right">C</div>
                    <div className="col-span-1 text-right">F</div>
                    <div className="col-span-2"></div>
                  </div>
                  {meal.foods.map((food, foodIndex) => (
                    <div key={foodIndex} className="group grid grid-cols-12 items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--ink-2)]">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-[var(--fg)]">{food.amount} {food.unit} {food.name}</p>
                      </div>
                      <div className="col-span-2 text-right text-sm text-[var(--fg-2)]">{food.calories}</div>
                      <div className="col-span-1 text-right text-sm text-[var(--ok)]">{food.protein}g</div>
                      <div className="col-span-1 text-right text-sm text-[var(--warn)]">{food.carbs}g</div>
                      <div className="col-span-1 text-right text-sm text-[var(--brand-400)]">{food.fat}g</div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => removeFoodFromMeal(mealIndex, foodIndex)}
                          className="p-1 text-[var(--fg-4)] opacity-0 transition-colors hover:text-[var(--brand-400)] group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add food search */}
              {selectedMealIndex === mealIndex ? (
                <div className="border-t border-[var(--line)] pt-4">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchFood(searchQuery)}
                      className="input-field flex-1"
                      placeholder="Search foods (e.g. chicken breast, rice)..."
                      autoFocus
                    />
                    <input
                      type="number"
                      value={foodAmount}
                      onChange={(e) => setFoodAmount(parseInt(e.target.value) || 100)}
                      className="input-field w-20 text-center"
                      min={1}
                    />
                    <span className="flex items-center text-sm text-[var(--fg-3)]">g</span>
                    <button
                      onClick={() => searchFood(searchQuery)}
                      disabled={searching}
                      className="btn btn-accent disabled:opacity-50"
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => addFoodToMeal(mealIndex, result)}
                          disabled={loadingNutrition}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--fg)] transition-colors hover:bg-[var(--ink-2)] disabled:opacity-50"
                        >
                          {loadingNutrition ? (
                            <Loader2 className="h-3 w-3 animate-spin text-[var(--brand-400)]" />
                          ) : (
                            <Plus className="h-3 w-3 text-[var(--brand-400)]" />
                          )}
                          <span>{result.name}</span>
                          {result.calories_per_100g !== undefined && (
                            <span className="text-xs text-[var(--fg-4)]">{result.calories_per_100g}kcal/100g</span>
                          )}
                          <span className="text-xs text-[var(--fg-4)]">
                            {result.source === 'local' ? '★' : result.source === 'openfoodfacts' ? 'OFF' : 'SP'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedMealIndex(null)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="mt-2 text-xs text-[var(--fg-3)] hover:text-[var(--fg)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedMealIndex(mealIndex)}
                  className="flex items-center gap-1 text-sm font-medium text-[var(--brand-400)] hover:text-[var(--brand-500)]"
                >
                  <Plus className="h-3 w-3" />
                  Add Food
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Re-roll counter */}
      {meals.length > 0 && (
        <p className="mb-4 text-center text-xs text-[var(--fg-3)]">
          {MAX_REROLLS - rerollsUsed} surprise re-roll{MAX_REROLLS - rerollsUsed !== 1 ? 's' : ''} remaining for this plan
        </p>
      )}

      {/* Add Meal Button */}
      <button
        onClick={addMeal}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line-strong)] py-3 text-[var(--fg-2)] transition-colors hover:border-[var(--brand-400)] hover:text-[var(--brand-400)]"
      >
        <Plus className="h-4 w-4" />
        Add Meal
      </button>

      {/* Save */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/diet"
          className="btn btn-secondary px-6 py-3"
        >
          Cancel
        </Link>
        <button
          onClick={savePlan}
          disabled={saving || meals.length === 0}
          className="btn btn-accent flex-1 justify-center py-3 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Utensils className="h-5 w-5" />
          )}
          <span>{saving ? 'Saving...' : 'Save Diet Plan'}</span>
        </button>
      </div>
    </div>
  )
}
