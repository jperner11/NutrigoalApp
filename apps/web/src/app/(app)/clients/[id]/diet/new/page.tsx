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
import { AppHeroPanel, ListCard, MetricCard } from '@/components/ui/AppDesign'
import { apiFetch, ApiError } from '@/lib/apiClient'

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

  if (!profile || !client) return <div className="text-[var(--fg-3)]">Loading...</div>

  const totalCals = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.calories, 0), 0)
  const totalProtein = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.protein, 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.carbs, 0), 0)
  const totalFat = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.fat, 0), 0)

  async function searchFood(query: string) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await apiFetch<{ results?: SearchResult[] }>(
        `/api/food/search?query=${encodeURIComponent(query)}&number=10`,
        { context: { feature: 'client-diet-new', action: 'search-food' } },
      )
      setSearchResults(data?.results ?? [])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to search foods')
    }
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
      const data = await apiFetch<{
        spoonacular_id?: number
        food_id?: string
        name?: string
        calories: number
        protein: number
        carbs: number
        fat: number
      }>(`/api/food/nutrition?id=${idParam}&amount=${amt}&unit=g&source=${sourceParam}`, {
        context: { feature: 'client-diet-new', action: 'get-nutrition' },
      })
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
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to get nutrition info')
    }
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
      const data = await apiFetch<{ food: { name: string } }>('/api/food/custom', {
        method: 'POST',
        body: customFood,
        context: { feature: 'client-diet-new', action: 'save-custom-food' },
      })
      toast.success(`"${data.food.name}" saved to your foods`)
      setShowCustomForm(false)
      setCustomFood({ name: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', default_amount: '100', default_unit: 'g' })
      if (searchQuery) searchFood(searchQuery)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save custom food')
    }
    setSavingCustom(false)
  }

  async function handleParseFreeText(mealIndex: number) {
    if (!freeText.trim()) return
    setParsingFreeText(true)
    try {
      const data = await apiFetch<{ foods?: FoodItem[] }>('/api/ai/parse-meal', {
        method: 'POST',
        body: { text: freeText, mealType: meals[mealIndex].meal_name },
        context: { feature: 'client-diet-new', action: 'parse-free-text' },
      })
      const parsed: FoodItem[] = (data?.foods ?? []).map((f) => ({ ...f, source: 'ai_parsed' as const }))
      setMeals(prev => {
        const updated = [...prev]
        updated[mealIndex].foods.push(...parsed)
        return updated
      })
      toast.success(`Parsed ${parsed.length} item${parsed.length === 1 ? '' : 's'}`)
      setFreeText('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to parse meal')
    }
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
    <div className="mx-auto max-w-[980px]">
      <Link href={`/clients/${id}`} className="btn btn-ghost mb-4 inline-flex">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to {client.full_name || 'Client'}</span>
      </Link>

      <AppHeroPanel
        eyebrow="N° 12 · Client diet"
        title="Diet,"
        accent="assigned."
        subtitle={`Create a coach-built meal plan for ${client.full_name || 'this client'} · target ${client.daily_calories ?? '—'} kcal.`}
      />

      {(client.dietary_restrictions?.length > 0 || client.food_dislikes?.length > 0 || client.allergies?.length > 0) && (
        <ListCard className="mb-6" eyebrow="CLIENT CONTEXT">
          <div className="space-y-1 text-sm text-[var(--fg-2)]">
            {client.allergies?.length > 0 && <p className="font-medium text-[var(--brand-400)]">Allergies: {client.allergies.join(', ')}</p>}
            {client.dietary_restrictions?.length > 0 && <p className="text-[var(--warn)]">Restrictions: {client.dietary_restrictions.join(', ')}</p>}
            {client.food_dislikes?.length > 0 && <p>Dislikes: {client.food_dislikes.join(', ')}</p>}
          </div>
        </ListCard>
      )}

      <ListCard className="mb-6" eyebrow="PLAN DETAILS">
        <label className="app-mono-label mb-2 block">Plan name</label>
        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
          className="input-field"
          placeholder="e.g. Cutting Plan - Week 1" />
      </ListCard>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="Calories" value={totalCals} footer={client.daily_calories ? `${Math.round((totalCals / client.daily_calories) * 100)}% of ${client.daily_calories}` : undefined} tone="accent" />
        <MetricCard label="Protein" value={totalProtein} unit="g" footer={client.daily_protein ? `${Math.round((totalProtein / client.daily_protein) * 100)}% of ${client.daily_protein}g` : undefined} tone="success" />
        <MetricCard label="Carbs" value={totalCarbs} unit="g" footer={client.daily_carbs ? `${Math.round((totalCarbs / client.daily_carbs) * 100)}% of ${client.daily_carbs}g` : undefined} tone="warn" />
        <MetricCard label="Fat" value={totalFat} unit="g" footer={client.daily_fat ? `${Math.round((totalFat / client.daily_fat) * 100)}% of ${client.daily_fat}g` : undefined} tone="danger" />
      </div>

      {meals.map((meal, mi) => (
        <div key={mi} className="card p-5 mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--fg)]">{meal.meal_name}</h3>
            <span className="text-sm font-medium text-[var(--ok)]">{meal.foods.reduce((s, f) => s + f.calories, 0)} kcal</span>
          </div>

          {meal.foods.map((food, fi) => (
            <div key={fi} className="flex items-center justify-between border-t border-[var(--line)] py-2">
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">{food.name}</p>
                <p className="text-xs text-[var(--fg-3)]">
                  {food.amount}{food.unit} · {food.calories}kcal · P{food.protein} C{food.carbs} F{food.fat}
                  {food.source && <span className="ml-1 text-[var(--fg-4)]">· {food.source === 'ai_parsed' ? 'AI' : food.source === 'custom' ? '★' : food.source === 'openfoodfacts' ? 'OFF' : 'SP'}</span>}
                </p>
              </div>
              <button onClick={() => removeFood(mi, fi)} className="text-[var(--fg-4)] hover:text-[var(--brand-400)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {selectedMealIndex === mi ? (
            <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
              <div className="flex gap-2">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchFood(searchQuery)}
                  className="input-field flex-1 px-3 py-2 text-sm" placeholder="Search food..." />
                <input type="number" value={foodAmount} onChange={e => setFoodAmount(Number(e.target.value))}
                  className="input-field w-20 px-3 py-2 text-center text-sm" />
                <span className="self-center text-xs text-[var(--fg-3)]">g</span>
                <button onClick={() => searchFood(searchQuery)}
                  className="btn btn-accent px-3 py-2 text-sm">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(food => (
                    <button key={food.id} onClick={() => addFoodToMeal(mi, food)} disabled={loadingNutrition}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-[var(--ink-2)]">
                      <div>
                        <span className="text-[var(--fg)]">{food.name}</span>
                        {food.calories_per_100g !== undefined && (
                          <span className="ml-2 text-xs text-[var(--fg-4)]">
                            {food.calories_per_100g}kcal/100g
                          </span>
                        )}
                        <span className="ml-1 text-xs text-[var(--fg-4)]">
                          {food.source === 'local' ? '★' : food.source === 'openfoodfacts' ? 'OFF' : 'SP'}
                        </span>
                      </div>
                      {loadingNutrition ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 text-[var(--brand-400)]" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--line)] pt-3">
                <label className="app-mono-label mb-1 block">Or describe a meal in plain text</label>
                <div className="flex gap-2">
                  <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleParseFreeText(mi)}
                    className="input-field flex-1 px-3 py-2 text-sm"
                    placeholder="e.g. 200g chicken breast, 150g rice, salad" />
                  <button onClick={() => handleParseFreeText(mi)} disabled={parsingFreeText}
                    className="btn btn-secondary whitespace-nowrap px-3 py-2 text-sm">
                    {parsingFreeText ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setShowCustomForm(!showCustomForm)}
                  className="flex items-center gap-1 text-xs text-[var(--brand-400)] hover:text-[var(--brand-500)]">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {showCustomForm ? 'Hide custom food form' : 'Create custom food'}
                </button>
                <button onClick={() => { setSelectedMealIndex(null); setSearchResults([]); setShowCustomForm(false) }}
                  className="text-xs text-[var(--fg-3)] hover:text-[var(--fg)]">Close</button>
              </div>

              {showCustomForm && (
                <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--ink-2)] p-4">
                  <input type="text" value={customFood.name} onChange={e => setCustomFood(p => ({ ...p, name: e.target.value }))}
                    className="input-field w-full px-3 py-2 text-sm" placeholder="Food name" />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="app-mono-label mb-1 block">Cal/100g</label>
                      <input type="number" value={customFood.calories_per_100g} onChange={e => setCustomFood(p => ({ ...p, calories_per_100g: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="app-mono-label mb-1 block">P/100g</label>
                      <input type="number" value={customFood.protein_per_100g} onChange={e => setCustomFood(p => ({ ...p, protein_per_100g: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="app-mono-label mb-1 block">C/100g</label>
                      <input type="number" value={customFood.carbs_per_100g} onChange={e => setCustomFood(p => ({ ...p, carbs_per_100g: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="app-mono-label mb-1 block">F/100g</label>
                      <input type="number" value={customFood.fat_per_100g} onChange={e => setCustomFood(p => ({ ...p, fat_per_100g: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="app-mono-label mb-1 block">Default amount</label>
                      <input type="number" value={customFood.default_amount} onChange={e => setCustomFood(p => ({ ...p, default_amount: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="app-mono-label mb-1 block">Unit</label>
                      <input type="text" value={customFood.default_unit} onChange={e => setCustomFood(p => ({ ...p, default_unit: e.target.value }))}
                        className="input-field w-full px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                  <button onClick={handleSaveCustomFood} disabled={savingCustom}
                    className="btn btn-accent w-full justify-center py-2 text-sm disabled:opacity-50">
                    {savingCustom ? 'Saving...' : 'Save Custom Food'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => { setSelectedMealIndex(mi); setSearchQuery(''); setSearchResults([]) }}
              className="mt-3 flex items-center space-x-1 text-sm text-[var(--brand-400)] hover:text-[var(--brand-500)]">
              <Search className="h-4 w-4" />
              <span>Search & Add Food</span>
            </button>
          )}
        </div>
      ))}

      <button onClick={addSnack}
        className="mb-6 w-full rounded-xl border-2 border-dashed border-[var(--line-strong)] py-3 text-sm font-medium text-[var(--fg-2)] transition-colors hover:border-[var(--brand-400)] hover:text-[var(--brand-400)]">
        + Add Snack
      </button>

      <button onClick={handleSave} disabled={saving}
        className="btn btn-accent w-full justify-center py-3 disabled:opacity-50">
        {saving ? 'Creating...' : 'Create Diet Plan'}
      </button>
    </div>
  )
}
