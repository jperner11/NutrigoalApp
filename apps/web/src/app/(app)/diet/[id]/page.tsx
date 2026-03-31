'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  ArrowLeft,
  Utensils,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
  Droplets,
  Clock,
  Check,
  X,
  RefreshCw,
  Lock,
} from 'lucide-react'
import type { DietPlan, DietPlanMeal } from '@/lib/supabase/types'
import { isFeatureLocked, canAccess } from '@/lib/tierUtils'
import PlanChat from '@/components/diet/PlanChat'
import UpgradeModal from '@/components/ui/UpgradeModal'
import WeekDayTabs from '@/components/diet/WeekDayTabs'
import type { DaySummary } from '@/components/diet/WeekDayTabs'

interface FoodItemExtended {
  spoonacular_id?: number
  name: string
  amount: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  alternatives?: { name: string; amount: number; unit: string }[]
}

interface MealMeta {
  label?: string
  time?: string
  timing_note?: string
  notes?: string
}

function parseFoods(raw: unknown): { meta: MealMeta; items: FoodItemExtended[] } {
  if (!raw) return { meta: {}, items: [] }

  // New format: { _meta: {...}, items: [...] }
  if (typeof raw === 'object' && raw !== null && '_meta' in raw) {
    const obj = raw as { _meta: MealMeta; items: FoodItemExtended[] }
    return { meta: obj._meta ?? {}, items: obj.items ?? [] }
  }

  // Old format: FoodItem[]
  if (Array.isArray(raw)) {
    return { meta: {}, items: raw as FoodItemExtended[] }
  }

  return { meta: {}, items: [] }
}

export default function DietPlanDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { profile } = useUser()

  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [meals, setMeals] = useState<DietPlanMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [activating, setActivating] = useState(false)
  const [alternativesModal, setAlternativesModal] = useState<{
    foodName: string
    amount: number
    unit: string
    alternatives: { name: string; amount: number; unit: string }[]
  } | null>(null)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [showMealPicker, setShowMealPicker] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)

  const isRoleLocked = isFeatureLocked(profile?.role ?? 'free', 'full_meals')
  const isFreeUser = isRoleLocked && (plan?.is_ai_generated !== false)

  // Check if this plan has multi-day meals
  const hasMultipleDays = meals.some(m => m.day_of_week !== null && m.day_of_week !== undefined)
  const filteredMeals = hasMultipleDays
    ? meals.filter(m => m.day_of_week === selectedDay)
    : meals

  // Compute per-day summaries for the tab badges
  const daySummaries: Record<number, DaySummary> = {}
  if (hasMultipleDays) {
    for (let d = 0; d < 7; d++) {
      const dayMeals = meals.filter(m => m.day_of_week === d)
      daySummaries[d] = {
        calories: dayMeals.reduce((s, m) => s + (m.total_calories || 0), 0),
        protein: dayMeals.reduce((s, m) => s + (m.total_protein || 0), 0),
        carbs: dayMeals.reduce((s, m) => s + (m.total_carbs || 0), 0),
        fat: dayMeals.reduce((s, m) => s + (m.total_fat || 0), 0),
        mealCount: dayMeals.length,
      }
    }
  }

  const loadPlan = useCallback(async () => {
    if (!profile || !params.id) return
    const supabase = createClient()

    const { data: planData, error: planError } = await supabase
      .from('diet_plans')
      .select('*')
      .eq('id', params.id)
      .single()

    if (planError || !planData) {
      toast.error('Diet plan not found')
      router.push('/diet')
      return
    }

    setPlan(planData)

    const { data: mealsData } = await supabase
      .from('diet_plan_meals')
      .select('*')
      .eq('diet_plan_id', params.id)

    setMeals(mealsData ?? [])
    setExpandedMeals(new Set((mealsData ?? []).map(m => m.id)))
    setLoading(false)
  }, [profile, params.id, router])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  // Load free user's selected meal from user_tier_selections
  useEffect(() => {
    if (!isFreeUser || !profile) return

    async function loadSelection() {
      const supabase = createClient()
      const { data } = await supabase
        .from('user_tier_selections')
        .select('selected_id')
        .eq('user_id', profile!.id)
        .eq('selection_type', 'meal')
        .single()

      if (data) {
        setSelectedMealId(data.selected_id)
      } else if (meals.length > 0) {
        setShowMealPicker(true)
      }
    }

    if (meals.length > 0) loadSelection()
  }, [isFreeUser, profile, meals])

  function toggleMeal(mealId: string) {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(mealId)) next.delete(mealId)
      else next.add(mealId)
      return next
    })
  }

  async function handleDelete() {
    if (!plan) return
    const confirmed = window.confirm(
      `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('diet_plans').delete().eq('id', plan.id)

    if (error) {
      toast.error('Failed to delete diet plan')
      setDeleting(false)
      return
    }

    toast.success('Diet plan deleted')
    router.push('/diet')
  }

  async function handleSelectFreeMeal(mealId: string) {
    if (!profile) return
    const supabase = createClient()

    await supabase
      .from('user_tier_selections')
      .upsert({
        user_id: profile.id,
        selection_type: 'meal' as const,
        selected_id: mealId,
      }, { onConflict: 'user_id,selection_type' })

    setSelectedMealId(mealId)
    setShowMealPicker(false)
    toast.success('Meal unlocked!')
  }

  async function handleSetActive() {
    if (!plan || !profile) return
    setActivating(true)
    const supabase = createClient()

    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('user_id', profile.id)

    const { error } = await supabase
      .from('diet_plans')
      .update({ is_active: true })
      .eq('id', plan.id)

    if (error) {
      toast.error('Failed to activate diet plan')
      setActivating(false)
      return
    }

    setPlan({ ...plan, is_active: true })
    toast.success(`"${plan.name}" is now your active plan`)
    setActivating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!plan) return null

  const totalCalories = filteredMeals.reduce((s, m) => s + (m.total_calories ?? 0), 0)
  const totalProtein = filteredMeals.reduce((s, m) => s + (m.total_protein ?? 0), 0)
  const totalCarbs = filteredMeals.reduce((s, m) => s + (m.total_carbs ?? 0), 0)
  const totalFat = filteredMeals.reduce((s, m) => s + (m.total_fat ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/diet" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
              {plan.is_active && (
                <span className="inline-flex items-center space-x-1 text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                  <Shield className="h-3 w-3" />
                  <span>Active</span>
                </span>
              )}
            </div>
            {plan.notes && !plan.notes.startsWith('{') && (
              <p className="text-gray-600 mt-1">{plan.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!plan.is_active && (
            <button
              onClick={handleSetActive}
              disabled={activating}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              <span>{activating ? 'Activating...' : 'Set as Active'}</span>
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Week Day Tabs */}
      {hasMultipleDays && (
        <WeekDayTabs
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          daySummaries={daySummaries}
        />
      )}

      {/* Daily Totals */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-purple-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Daily Totals</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Calories</p>
            <p className={`text-lg font-bold ${plan.target_calories && Math.abs(totalCalories - plan.target_calories) < plan.target_calories * 0.1 ? 'text-purple-700' : 'text-gray-900'}`}>
              {Math.round(totalCalories)}
            </p>
            {plan.target_calories && <p className="text-xs text-gray-400">/ {plan.target_calories}</p>}
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Protein</p>
            <p className="text-lg font-bold text-green-700">{Math.round(totalProtein)}g</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Carbs</p>
            <p className="text-lg font-bold text-amber-700">{Math.round(totalCarbs)}g</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Fat</p>
            <p className="text-lg font-bold text-rose-700">{Math.round(totalFat)}g</p>
          </div>
        </div>
      </div>

      {/* Water Target */}
      {profile?.daily_water_ml && (
        <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 mb-6 flex items-center gap-3">
          <Droplets className="h-5 w-5 text-blue-500" />
          <div>
            <span className="text-sm font-medium text-blue-800">Water Goal</span>
            <span className="text-sm text-blue-600 ml-2">{(profile.daily_water_ml / 1000).toFixed(1)}L / day</span>
          </div>
        </div>
      )}

      {/* Meals */}
      {filteredMeals.length === 0 ? (
        <div className="card p-12 text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {hasMultipleDays && meals.length > 0 ? 'No meals for this day' : 'No meals in this plan'}
          </h3>
          <p className="text-gray-500">
            {hasMultipleDays && meals.length > 0 ? 'Select a different day to view meals.' : "This plan doesn't have any meals yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeals.map((meal) => {
            const isExpanded = expandedMeals.has(meal.id)
            const { meta, items } = parseFoods(meal.foods)
            const isLocked = isFreeUser && selectedMealId !== null && meal.id !== selectedMealId

            return (
              <div
                key={meal.id}
                className={`relative bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
                  isLocked ? '' : 'hover:shadow-md'
                }`}
              >
                {/* Meal Header — always visible */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {meta.label && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-0.5 block">
                          {meta.label}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{meal.meal_name}</h3>
                        {isLocked && <Lock className="h-4 w-4 text-gray-400" />}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-gray-500">
                            {Math.round(meal.total_calories ?? 0)} cal
                            <span className="mx-1.5 text-gray-300">|</span>
                            {Math.round(meal.total_protein ?? 0)}P · {Math.round(meal.total_carbs ?? 0)}C · {Math.round(meal.total_fat ?? 0)}F
                          </p>
                        </div>
                      )}
                    </div>
                    {meta.time && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {meta.time}
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800 mt-3 transition-colors"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Upgrade to see this meal</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleMeal(meal.id)}
                      className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800 mt-3 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <span>Hide</span>
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <span>Show</span>
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded Content — only for unlocked meals */}
                {isExpanded && !isLocked && (
                  <div className="border-t border-gray-100">
                    {/* Notes / Observations */}
                    {(meta.notes || meta.timing_note) && (
                      <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Notes</h4>
                        {meta.timing_note && (
                          <p className="text-sm text-gray-600 mb-1">{meta.timing_note}</p>
                        )}
                        {meta.notes && (
                          <p className="text-sm text-gray-600 whitespace-pre-line">{meta.notes}</p>
                        )}
                      </div>
                    )}

                    {/* Ingredients checklist */}
                    {items.length > 0 && (
                      <div className="px-5 py-4">
                        <div className="space-y-1">
                          {items.map((food, idx) => (
                            <div key={idx} className="flex items-center gap-3 py-2.5">
                              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-purple-600" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {food.amount}{food.unit} {food.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {Math.round(food.calories)} cal · {Math.round(food.protein)}P · {Math.round(food.carbs)}C · {Math.round(food.fat)}F
                                </p>
                              </div>

                              {food.alternatives && food.alternatives.length > 0 && (
                                <button
                                  onClick={() => setAlternativesModal({
                                    foodName: food.name,
                                    amount: food.amount,
                                    unit: food.unit,
                                    alternatives: food.alternatives!,
                                  })}
                                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Alternatives
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Free User Meal Picker Modal */}
      {showMealPicker && isFreeUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Choose a meal to unlock</h3>
              <p className="text-sm text-gray-500 mt-1">
                Free plan includes 1 meal. Pick the one you&apos;d like to see in full detail.
              </p>
            </div>
            <div className="px-6 py-4 space-y-2">
              {filteredMeals.map(meal => {
                const { meta } = parseFoods(meal.foods)
                return (
                  <button
                    key={meal.id}
                    onClick={() => handleSelectFreeMeal(meal.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Utensils className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {meta.label && (
                        <p className="text-xs font-semibold text-purple-600">{meta.label}</p>
                      )}
                      <p className="font-medium text-gray-900">{meal.meal_name}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(meal.total_calories ?? 0)} cal
                        {meta.time && ` · ${meta.time}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-6 pb-5">
              <p className="text-xs text-gray-400 text-center">
                Upgrade to Pro to see all meals
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Full meal plan access"
      />

      {/* Alternatives Modal */}
      {alternativesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Alternatives</h3>
                <button
                  onClick={() => setAlternativesModal(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                You can substitute {alternativesModal.amount}{alternativesModal.unit} {alternativesModal.foodName} with:
              </p>
            </div>

            {/* Alternatives list */}
            <div className="px-6 py-4 space-y-3">
              {alternativesModal.alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {alt.amount}{alt.unit} {alt.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Close button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setAlternativesModal(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat — paid users only */}
      {profile && plan && canAccess(profile.role, 'ai_suggestions') && (
        <PlanChat
          planId={plan.id}
          dayOfWeek={hasMultipleDays ? selectedDay : null}
          meals={filteredMeals.map(meal => {
            const { meta, items } = parseFoods(meal.foods)
            return {
              id: meal.id,
              label: meta.label || meal.meal_type,
              meal_type: meal.meal_type,
              meal_name: meal.meal_name,
              time: meta.time || '',
              calories: meal.total_calories ?? 0,
              protein: meal.total_protein ?? 0,
              carbs: meal.total_carbs ?? 0,
              fat: meal.total_fat ?? 0,
              ingredients: items.map(item => ({
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              })),
            }
          })}
          targets={{
            calories: plan.target_calories,
            protein: plan.target_protein,
            carbs: plan.target_carbs,
            fat: plan.target_fat,
          }}
          userProfile={{
            goal: profile.goal ?? undefined,
            allergies: profile.allergies ?? [],
            foodDislikes: profile.food_dislikes ?? [],
          }}
          onMealsUpdated={loadPlan}
        />
      )}
    </div>
  )
}
