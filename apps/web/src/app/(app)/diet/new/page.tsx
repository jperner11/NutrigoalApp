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
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; image: string }>>([])
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
      const res = await fetch(`/api/food/search?query=${encodeURIComponent(query)}&number=8`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } catch {
      toast.error('Failed to search foods')
    }
    setSearching(false)
  }

  async function addFoodToMeal(mealIndex: number, food: { id: number; name: string }) {
    setLoadingNutrition(true)
    try {
      const res = await fetch(`/api/food/nutrition?id=${food.id}&amount=${foodAmount}&unit=g`)
      const data = await res.json()

      const foodItem: FoodItem = {
        spoonacular_id: food.id,
        name: data.name || food.name,
        amount: foodAmount,
        unit: 'g',
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
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
      spoonacular_id: 0,
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

      const res = await fetch(`/api/food/mealplan?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Failed to generate')
      }

      const data = await res.json()

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

      const res = await fetch('/api/food/mealplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType: slot.key,
          targetCalories: mealCalories,
          targetProtein: mealProtein,
          targetCarbs: mealCarbs,
          targetFat: mealFat,
          ingredients: mealPrefs[slot.key as keyof typeof mealPrefs] || '',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Failed to regenerate')
      }

      const meal: APIMeal = await res.json()

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
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/diet" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-900" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Diet Plan</h1>
          <p className="text-gray-800 mt-1">Create a meal plan based on your goals.</p>
        </div>
      </div>

      {/* Plan Name & Notes — FIRST */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Plan Name</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g. My Cutting Plan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
              placeholder="Any notes about this plan..."
            />
          </div>
        </div>
      </div>

      {/* Auto-Generate with Preferences */}
      {canAccess(profile.role, 'ai_suggestions') ? (
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Auto-Generate Plan</h3>
        </div>
        <p className="text-sm text-gray-800 mb-4">
          Target: {targetCalories} cal · {targetProtein}g protein · {targetCarbs}g carbs · {targetFat}g fat. Tell us what ingredients you like for each meal.
        </p>

        <div className="space-y-3 mb-4">
          {[
            { key: 'breakfast', label: 'Breakfast', placeholder: 'e.g. eggs, oats, banana, yogurt' },
            { key: 'lunch', label: 'Lunch', placeholder: 'e.g. chicken, rice, broccoli, avocado' },
            { key: 'dinner', label: 'Dinner', placeholder: 'e.g. salmon, sweet potato, asparagus' },
          ].map(slot => (
            <div key={slot.key}>
              <label className="block text-sm font-medium text-gray-900 mb-1">{slot.label} ingredients</label>
              <input
                type="text"
                value={mealPrefs[slot.key as keyof typeof mealPrefs]}
                onChange={(e) => setMealPrefs(prev => ({ ...prev, [slot.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={slot.placeholder}
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIncludeSnack(!includeSnack)}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                includeSnack
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Plus className="h-3 w-3" />
              Afternoon Snack
            </button>
          </div>

          {includeSnack && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Snack ingredients</label>
              <input
                type="text"
                value={mealPrefs.snack}
                onChange={(e) => setMealPrefs(prev => ({ ...prev, snack: e.target.value }))}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. nuts, protein bar, fruit, cheese"
              />
            </div>
          )}
        </div>

        <button
          onClick={generatePlan}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{generating ? 'Generating meals...' : 'Generate Meal Plan'}</span>
        </button>
      </div>
      ) : (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Auto-Generate Plan</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          AI meal plan generation is a Pro feature. You can still manually build your plan below using the food search.
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800"
        >
          Upgrade to Pro
        </Link>
      </div>
      )}

      {/* Macro Summary */}
      {meals.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Daily Totals</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-800 mb-1">Calories</p>
              <p className={`text-lg font-bold ${Math.abs(totalCalories - targetCalories) < targetCalories * 0.1 ? 'text-purple-700' : 'text-red-600'}`}>
                {Math.round(totalCalories)}
              </p>
              <p className="text-xs text-gray-500">/ {targetCalories}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-800 mb-1">Protein</p>
              <p className={`text-lg font-bold ${Math.abs(totalProtein - targetProtein) < targetProtein * 0.15 ? 'text-green-700' : 'text-red-600'}`}>
                {Math.round(totalProtein)}g
              </p>
              <p className="text-xs text-gray-500">/ {targetProtein}g</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-800 mb-1">Carbs</p>
              <p className={`text-lg font-bold ${Math.abs(totalCarbs - targetCarbs) < targetCarbs * 0.15 ? 'text-amber-700' : 'text-red-600'}`}>
                {Math.round(totalCarbs)}g
              </p>
              <p className="text-xs text-gray-500">/ {targetCarbs}g</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-800 mb-1">Fat</p>
              <p className={`text-lg font-bold ${Math.abs(totalFat - targetFat) < targetFat * 0.15 ? 'text-rose-700' : 'text-red-600'}`}>
                {Math.round(totalFat)}g
              </p>
              <p className="text-xs text-gray-500">/ {targetFat}g</p>
            </div>
          </div>
        </div>
      )}

      {/* Meals */}
      <div className="space-y-4 mb-6">
        {meals.map((meal, mealIndex) => (
          <div key={mealIndex} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Meal Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Utensils className="h-4 w-4 text-purple-600" />
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
                      className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-lg"
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
                        className="text-xs text-gray-500 bg-transparent border-none focus:outline-none p-0"
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
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <p className="text-sm font-bold text-gray-900">{Math.round(meal.total_calories)} cal</p>
                    <p className="text-xs text-gray-600">
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
                  <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-2 pb-1 border-b border-gray-100">
                    <div className="col-span-5">Ingredient</div>
                    <div className="col-span-2 text-right">Cal</div>
                    <div className="col-span-1 text-right">P</div>
                    <div className="col-span-1 text-right">C</div>
                    <div className="col-span-1 text-right">F</div>
                    <div className="col-span-2"></div>
                  </div>
                  {meal.foods.map((food, foodIndex) => (
                    <div key={foodIndex} className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="col-span-5">
                        <p className="text-sm font-medium text-gray-900">{food.amount} {food.unit} {food.name}</p>
                      </div>
                      <div className="col-span-2 text-right text-sm text-gray-700">{food.calories}</div>
                      <div className="col-span-1 text-right text-sm text-green-700">{food.protein}g</div>
                      <div className="col-span-1 text-right text-sm text-amber-700">{food.carbs}g</div>
                      <div className="col-span-1 text-right text-sm text-rose-700">{food.fat}g</div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => removeFoodFromMeal(mealIndex, foodIndex)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchFood(searchQuery)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Search foods (e.g. chicken breast, rice)..."
                      autoFocus
                    />
                    <input
                      type="number"
                      value={foodAmount}
                      onChange={(e) => setFoodAmount(parseInt(e.target.value) || 100)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min={1}
                    />
                    <span className="flex items-center text-sm text-gray-500">g</span>
                    <button
                      onClick={() => searchFood(searchQuery)}
                      disabled={searching}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
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
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {loadingNutrition ? (
                            <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                          ) : (
                            <Plus className="h-3 w-3 text-purple-600" />
                          )}
                          {result.name}
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
                    className="text-xs text-gray-500 hover:text-gray-700 mt-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedMealIndex(mealIndex)}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
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
        <p className="text-center text-xs text-gray-500 mb-4">
          {MAX_REROLLS - rerollsUsed} surprise re-roll{MAX_REROLLS - rerollsUsed !== 1 ? 's' : ''} remaining for this plan
        </p>
      )}

      {/* Add Meal Button */}
      <button
        onClick={addMeal}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-800 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 mb-8"
      >
        <Plus className="h-4 w-4" />
        Add Meal
      </button>

      {/* Save */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/diet"
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={savePlan}
          disabled={saving || meals.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
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
