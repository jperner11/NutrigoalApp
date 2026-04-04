'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { FoodItem, MealType, UserProfile } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
}

export default function NewClientDietPlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useUser()
  const [client, setClient] = useState<UserProfile | null>(null)
  const [planName, setPlanName] = useState('')
  const [meals, setMeals] = useState<MealEntry[]>([
    { meal_type: 'breakfast', meal_name: 'Breakfast', foods: [] },
    { meal_type: 'lunch', meal_name: 'Lunch', foods: [] },
    { meal_type: 'dinner', meal_name: 'Dinner', foods: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string }>>([])
  const [searching, setSearching] = useState(false)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [foodAmount, setFoodAmount] = useState(100)

  useEffect(() => {
    if (!profile) return
    if (!isTrainerRole(profile.role)) { router.push('/dashboard'); return }
    const supabase = createClient()
    supabase.from('user_profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setClient(data as UserProfile)
    })
  }, [profile, id, router])

  if (!profile || !client) return <div className="text-gray-500">Loading...</div>

  const totalCals = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.calories, 0), 0)
  const totalProtein = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.protein, 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.carbs, 0), 0)
  const totalFat = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.fat, 0), 0)

  async function searchFood(query: string) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/food/search?query=${encodeURIComponent(query)}&number=8`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } catch { toast.error('Failed to search foods') }
    setSearching(false)
  }

  async function addFoodToMeal(mealIndex: number, food: { id: number; name: string }) {
    setLoadingNutrition(true)
    try {
      const res = await fetch(`/api/food/nutrition?id=${food.id}&amount=${foodAmount}&unit=g`)
      const data = await res.json()
      const foodItem: FoodItem = {
        spoonacular_id: food.id, name: data.name || food.name, amount: foodAmount, unit: 'g',
        calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat,
      }
      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex].foods.push(foodItem)
        return updated
      })
    } catch { toast.error('Failed to get nutrition info') }
    setLoadingNutrition(false)
  }

  function removeFood(mealIndex: number, foodIndex: number) {
    setMeals(prev => {
      const updated = [...prev]
      updated[mealIndex].foods.splice(foodIndex, 1)
      return updated
    })
  }

  function addSnack() {
    setMeals(prev => [...prev, { meal_type: 'snack', meal_name: 'Snack', foods: [] }])
  }

  async function handleSave() {
    if (!planName.trim()) { toast.error('Enter a plan name'); return }
    if (meals.every(m => m.foods.length === 0)) { toast.error('Add at least one food'); return }

    setSaving(true)
    const supabase = createClient()

    // Deactivate old plans
    await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('diet_plans').insert({
      user_id: id, created_by: profile!.id, name: planName,
      target_calories: totalCals, target_protein: totalProtein, target_carbs: totalCarbs, target_fat: totalFat,
      is_active: true,
    }).select().single()

    if (error || !plan) { toast.error(error?.message || 'Failed to create plan'); setSaving(false); return }

    const mealRows = meals.filter(m => m.foods.length > 0).map(m => ({
      diet_plan_id: plan.id, meal_type: m.meal_type, meal_name: m.meal_name, foods: m.foods,
      total_calories: m.foods.reduce((s, f) => s + f.calories, 0),
      total_protein: m.foods.reduce((s, f) => s + f.protein, 0),
      total_carbs: m.foods.reduce((s, f) => s + f.carbs, 0),
      total_fat: m.foods.reduce((s, f) => s + f.fat, 0),
    }))
    await supabase.from('diet_plan_meals').insert(mealRows)

    toast.success(`Diet plan created for ${client?.full_name}`)
    router.push(`/clients/${id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/clients/${id}`} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to {client.full_name || 'Client'}</span>
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">New Diet Plan</h1>
      <p className="text-gray-500 mb-6">for {client.full_name} · Target: {client.daily_calories ?? '—'} kcal</p>

      {/* Client dietary info */}
      {(client.dietary_restrictions?.length > 0 || client.food_dislikes?.length > 0 || client.allergies?.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm">
          {client.allergies?.length > 0 && <p className="text-red-700 font-medium">Allergies: {client.allergies.join(', ')}</p>}
          {client.dietary_restrictions?.length > 0 && <p className="text-amber-700">Restrictions: {client.dietary_restrictions.join(', ')}</p>}
          {client.food_dislikes?.length > 0 && <p className="text-gray-600">Dislikes: {client.food_dislikes.join(', ')}</p>}
        </div>
      )}

      {/* Plan Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="e.g. Cutting Plan - Week 1" />
      </div>

      {/* Macro Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MacroCard label="Calories" value={totalCals} target={client.daily_calories} color="text-green-600" />
        <MacroCard label="Protein" value={totalProtein} target={client.daily_protein} unit="g" color="text-blue-600" />
        <MacroCard label="Carbs" value={totalCarbs} target={client.daily_carbs} unit="g" color="text-amber-600" />
        <MacroCard label="Fat" value={totalFat} target={client.daily_fat} unit="g" color="text-red-600" />
      </div>

      {/* Meals */}
      {meals.map((meal, mi) => (
        <div key={mi} className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{meal.meal_name}</h3>
            <span className="text-sm text-green-600 font-medium">{meal.foods.reduce((s, f) => s + f.calories, 0)} kcal</span>
          </div>

          {meal.foods.map((food, fi) => (
            <div key={fi} className="flex items-center justify-between py-2 border-t border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{food.name}</p>
                <p className="text-xs text-gray-500">{food.amount}{food.unit} · {food.calories}kcal · P{food.protein} C{food.carbs} F{food.fat}</p>
              </div>
              <button onClick={() => removeFood(mi, fi)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Inline food search */}
          {selectedMealIndex === mi ? (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex gap-2 mb-2">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchFood(searchQuery)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="Search food..." />
                <input type="number" value={foodAmount} onChange={e => setFoodAmount(Number(e.target.value))}
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg text-center" />
                <span className="self-center text-xs text-gray-500">g</span>
                <button onClick={() => searchFood(searchQuery)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
              {searchResults.map(food => (
                <button key={food.id} onClick={() => addFoodToMeal(mi, food)} disabled={loadingNutrition}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded flex justify-between items-center">
                  <span>{food.name}</span>
                  {loadingNutrition ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 text-purple-600" />}
                </button>
              ))}
              <button onClick={() => { setSelectedMealIndex(null); setSearchResults([]) }}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2">Close search</button>
            </div>
          ) : (
            <button onClick={() => { setSelectedMealIndex(mi); setSearchQuery(''); setSearchResults([]) }}
              className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-700 mt-3">
              <Search className="h-4 w-4" />
              <span>Search & Add Food</span>
            </button>
          )}
        </div>
      ))}

      <button onClick={addSnack}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors mb-6">
        + Add Snack
      </button>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50">
        {saving ? 'Creating...' : 'Create Diet Plan'}
      </button>
    </div>
  )
}

function MacroCard({ label, value, target, unit, color }: { label: string; value: number; target: number | null; unit?: string; color: string }) {
  const pct = target ? Math.round((value / target) * 100) : 0
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}{unit}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {target && <p className="text-xs text-gray-400 mt-1">{pct}% of {target}{unit}</p>}
    </div>
  )
}
