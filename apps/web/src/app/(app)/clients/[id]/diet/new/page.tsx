'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Search, Loader2, PlusCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { FoodItem, MealType, UserProfile } from '@/lib/supabase/types'
import { isTrainerRole } from '@nutrigoal/shared'

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
}

interface SearchResult {
  id: string
  name: string
  source: 'local' | 'spoonacular' | 'openfoodfacts'
  external_id?: string
  calories_per_100g?: number
  protein_per_100g?: number
  carbs_per_100g?: number
  fat_per_100g?: number
  default_amount?: number
  default_unit?: string
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMealIndex, setSelectedMealIndex] = useState<number | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [foodAmount, setFoodAmount] = useState(100)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customFood, setCustomFood] = useState({
    name: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '',
    default_amount: '100', default_unit: 'g',
  })
  const [savingCustom, setSavingCustom] = useState(false)
  const [freeText, setFreeText] = useState('')
  const [parsingFreeText, setParsingFreeText] = useState(false)

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
      const res = await fetch(`/api/food/search?query=${encodeURIComponent(query)}&number=10`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } catch { toast.error('Failed to search foods') }
    setSearching(false)
  }

  async function addFoodToMeal(mealIndex: number, food: SearchResult) {
    setLoadingNutrition(true)
    try {
      const amt = food.default_amount ?? foodAmount

      if (food.source === 'local' && food.calories_per_100g !== undefined) {
        const scale = amt / 100
        const foodItem: FoodItem = {
          food_id: food.id,
          source: 'custom',
          name: food.name,
          amount: amt,
          unit: food.default_unit ?? 'g',
          calories: Math.round((food.calories_per_100g ?? 0) * scale),
          protein: Math.round((food.protein_per_100g ?? 0) * scale * 10) / 10,
          carbs: Math.round((food.carbs_per_100g ?? 0) * scale * 10) / 10,
          fat: Math.round((food.fat_per_100g ?? 0) * scale * 10) / 10,
        }
        setMeals(prev => {
          const updated = [...prev]
          updated[mealIndex].foods.push(foodItem)
          return updated
        })
        setFoodAmount(100)
        setLoadingNutrition(false)
        return
      }

      const sourceParam = food.source === 'openfoodfacts' ? 'openfoodfacts' : 'spoonacular'
      const idParam = food.external_id ?? food.id
      const res = await fetch(`/api/food/nutrition?id=${idParam}&amount=${amt}&unit=g&source=${sourceParam}`)
      const data = await res.json()
      const foodItem: FoodItem = {
        spoonacular_id: data.spoonacular_id,
        food_id: data.food_id,
        source: food.source === 'openfoodfacts' ? 'openfoodfacts' : 'spoonacular',
        name: data.name || food.name,
        amount: amt,
        unit: 'g',
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      }
      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex].foods.push(foodItem)
        return updated
      })
      setFoodAmount(100)
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

  async function handleSaveCustomFood() {
    if (!customFood.name.trim()) { toast.error('Enter a food name'); return }
    setSavingCustom(true)
    try {
      const res = await fetch('/api/food/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customFood),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message); setSavingCustom(false); return }
      toast.success(`"${data.food.name}" saved to your foods`)
      setShowCustomForm(false)
      setCustomFood({ name: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', default_amount: '100', default_unit: 'g' })
      if (searchQuery) searchFood(searchQuery)
    } catch { toast.error('Failed to save custom food') }
    setSavingCustom(false)
  }

  async function handleParseFreeText(mealIndex: number) {
    if (!freeText.trim()) return
    setParsingFreeText(true)
    try {
      const res = await fetch('/api/ai/parse-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freeText, mealType: meals[mealIndex].meal_name }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message); setParsingFreeText(false); return }
      const parsed: FoodItem[] = (data.foods ?? []).map((f: FoodItem) => ({ ...f, source: 'ai_parsed' as const }))
      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex].foods.push(...parsed)
        return updated
      })
      toast.success(`Parsed ${parsed.length} item${parsed.length === 1 ? '' : 's'}`)
      setFreeText('')
    } catch { toast.error('Failed to parse meal') }
    setParsingFreeText(false)
  }

  async function handleSave() {
    if (!planName.trim()) { toast.error('Enter a plan name'); return }
    if (meals.every(m => m.foods.length === 0)) { toast.error('Add at least one food'); return }

    setSaving(true)
    const supabase = createClient()

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

      {(client.dietary_restrictions?.length > 0 || client.food_dislikes?.length > 0 || client.allergies?.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm">
          {client.allergies?.length > 0 && <p className="text-red-700 font-medium">Allergies: {client.allergies.join(', ')}</p>}
          {client.dietary_restrictions?.length > 0 && <p className="text-amber-700">Restrictions: {client.dietary_restrictions.join(', ')}</p>}
          {client.food_dislikes?.length > 0 && <p className="text-gray-600">Dislikes: {client.food_dislikes.join(', ')}</p>}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="e.g. Cutting Plan - Week 1" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <MacroCard label="Calories" value={totalCals} target={client.daily_calories} color="text-green-600" />
        <MacroCard label="Protein" value={totalProtein} target={client.daily_protein} unit="g" color="text-blue-600" />
        <MacroCard label="Carbs" value={totalCarbs} target={client.daily_carbs} unit="g" color="text-amber-600" />
        <MacroCard label="Fat" value={totalFat} target={client.daily_fat} unit="g" color="text-red-600" />
      </div>

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
                <p className="text-xs text-gray-500">
                  {food.amount}{food.unit} · {food.calories}kcal · P{food.protein} C{food.carbs} F{food.fat}
                  {food.source && <span className="ml-1 text-gray-400">· {food.source === 'ai_parsed' ? 'AI' : food.source === 'custom' ? '★' : food.source === 'openfoodfacts' ? 'OFF' : 'SP'}</span>}
                </p>
              </div>
              <button onClick={() => removeFood(mi, fi)} className="text-gray-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {selectedMealIndex === mi ? (
            <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
              <div className="flex gap-2">
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

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(food => (
                    <button key={food.id} onClick={() => addFoodToMeal(mi, food)} disabled={loadingNutrition}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 rounded flex justify-between items-center">
                      <div>
                        <span>{food.name}</span>
                        {food.calories_per_100g !== undefined && (
                          <span className="text-xs text-gray-400 ml-2">
                            {food.calories_per_100g}kcal/100g
                          </span>
                        )}
                        <span className="text-xs text-gray-300 ml-1">
                          {food.source === 'local' ? '★' : food.source === 'openfoodfacts' ? 'OFF' : 'SP'}
                        </span>
                      </div>
                      {loadingNutrition ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 text-purple-600" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Or describe a meal in plain text</label>
                <div className="flex gap-2">
                  <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleParseFreeText(mi)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    placeholder="e.g. 200g chicken breast, 150g rice, salad" />
                  <button onClick={() => handleParseFreeText(mi)} disabled={parsingFreeText}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 whitespace-nowrap">
                    {parsingFreeText ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setShowCustomForm(!showCustomForm)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {showCustomForm ? 'Hide custom food form' : 'Create custom food'}
                </button>
                <button onClick={() => { setSelectedMealIndex(null); setSearchResults([]); setShowCustomForm(false) }}
                  className="text-xs text-gray-500 hover:text-gray-700">Close</button>
              </div>

              {showCustomForm && (
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                  <input type="text" value={customFood.name} onChange={e => setCustomFood(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" placeholder="Food name" />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cal/100g</label>
                      <input type="number" value={customFood.calories_per_100g} onChange={e => setCustomFood(p => ({ ...p, calories_per_100g: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">P/100g</label>
                      <input type="number" value={customFood.protein_per_100g} onChange={e => setCustomFood(p => ({ ...p, protein_per_100g: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">C/100g</label>
                      <input type="number" value={customFood.carbs_per_100g} onChange={e => setCustomFood(p => ({ ...p, carbs_per_100g: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">F/100g</label>
                      <input type="number" value={customFood.fat_per_100g} onChange={e => setCustomFood(p => ({ ...p, fat_per_100g: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Default amount</label>
                      <input type="number" value={customFood.default_amount} onChange={e => setCustomFood(p => ({ ...p, default_amount: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Unit</label>
                      <input type="text" value={customFood.default_unit} onChange={e => setCustomFood(p => ({ ...p, default_unit: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                  </div>
                  <button onClick={handleSaveCustomFood} disabled={savingCustom}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                    {savingCustom ? 'Saving...' : 'Save Custom Food'}
                  </button>
                </div>
              )}
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
