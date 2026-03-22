'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Utensils, Sparkles, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { MEAL_TYPES } from '@/lib/constants'
import type { FoodItem, MealType } from '@/lib/supabase/types'

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

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
  const [mealPrefs, setMealPrefs] = useState({
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: '',
  })

  if (!profile) return null

  const targetCalories = profile.daily_calories ?? 2000
  const targetProtein = profile.daily_protein ?? 150
  const targetCarbs = profile.daily_carbs ?? 250
  const targetFat = profile.daily_fat ?? 65

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

  async function generatePlan() {
    setGenerating(true)
    try {
      const mealSlots = [
        { key: 'breakfast', label: 'Breakfast', type: 'breakfast' as MealType },
        { key: 'lunch', label: 'Lunch', type: 'lunch' as MealType },
        { key: 'dinner', label: 'Dinner', type: 'dinner' as MealType },
        ...(includeSnack ? [{ key: 'snack', label: 'Afternoon Snack', type: 'snack' as MealType }] : []),
      ]

      const params = new URLSearchParams({
        targetCalories: String(targetCalories),
        targetProtein: String(targetProtein),
        targetCarbs: String(targetCarbs),
        targetFat: String(targetFat),
        mealCount: String(mealSlots.length),
      })

      // Add ingredient preferences per meal
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
        (meal: {
          id: number
          title: string
          calories: number
          protein: number
          carbs: number
          fat: number
          servings: number
        }, index: number) => {
          const slot = mealSlots[index]
          const foods: FoodItem[] = [{
            spoonacular_id: meal.id,
            name: meal.title,
            amount: meal.servings || 1,
            unit: meal.servings === 1 ? 'serving' : 'servings',
            calories: Math.round(meal.calories),
            protein: Math.round(meal.protein * 10) / 10,
            carbs: Math.round(meal.carbs * 10) / 10,
            fat: Math.round(meal.fat * 10) / 10,
          }]

          return {
            meal_type: slot?.type || 'snack',
            meal_name: slot?.label || meal.title,
            foods,
            total_calories: Math.round(meal.calories),
            total_protein: Math.round(meal.protein),
            total_carbs: Math.round(meal.carbs),
            total_fat: Math.round(meal.fat),
          }
        }
      )

      setMeals(generatedMeals)
      setPlanName(`${profile?.full_name?.split(' ')[0] || 'My'}'s Meal Plan`)
      toast.success('Meal plan generated! You can customize the foods.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate meal plan. Try again.')
    }
    setGenerating(false)
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

    // Deactivate other plans
    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('user_id', profile.id)
      .eq('is_active', true)

    // Create the plan
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

    // Insert meals
    const mealInserts = meals.map(meal => ({
      diet_plan_id: plan.id,
      day_of_week: null, // null = every day
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

      {/* Auto-Generate with Preferences */}
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

          {/* Optional snack */}
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

      {/* Plan Name & Notes */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
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

      {/* Macro Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Daily Totals</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-800 mb-1">Calories</p>
            <p className="text-lg font-bold text-purple-700">{Math.round(totalCalories)}</p>
            <p className="text-xs text-gray-500">/ {targetCalories}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-800 mb-1">Protein</p>
            <p className="text-lg font-bold text-green-700">{Math.round(totalProtein)}g</p>
            <p className="text-xs text-gray-500">/ {targetProtein}g</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-800 mb-1">Carbs</p>
            <p className="text-lg font-bold text-amber-700">{Math.round(totalCarbs)}g</p>
            <p className="text-xs text-gray-500">/ {targetCarbs}g</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-800 mb-1">Fat</p>
            <p className="text-lg font-bold text-rose-700">{Math.round(totalFat)}g</p>
            <p className="text-xs text-gray-500">/ {targetFat}g</p>
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-4 mb-6">
        {meals.map((meal, mealIndex) => (
          <div key={mealIndex} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
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
                    className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
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
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{Math.round(meal.total_calories)} cal</p>
                <p className="text-xs text-gray-500">
                  {Math.round(meal.total_protein)}P · {Math.round(meal.total_carbs)}C · {Math.round(meal.total_fat)}F
                </p>
              </div>
            </div>

            {/* Food items */}
            {meal.foods.length > 0 && (
              <div className="space-y-2 mb-4">
                {meal.foods.map((food, foodIndex) => (
                  <div key={foodIndex} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-900">{food.amount}{food.unit} {food.name}</p>
                      <p className="text-xs text-gray-500">{food.calories} cal · {food.protein}g P · {food.carbs}g C · {food.fat}g F</p>
                    </div>
                    <button
                      onClick={() => removeFoodFromMeal(mealIndex, foodIndex)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
        ))}
      </div>

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
