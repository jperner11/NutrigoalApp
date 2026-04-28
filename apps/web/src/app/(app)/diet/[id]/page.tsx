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
import { AppHeroPanel, EmptyStateCard, ListCard, MetricCard } from '@/components/ui/AppDesign'

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
      <ListCard eyebrow="LOADING" title="Opening your diet plan.">
        <div className="app-progress-track">
          <div className="w-1/3 animate-pulse" />
        </div>
      </ListCard>
    )
  }

  if (!plan) return null

  const totalCalories = filteredMeals.reduce((s, m) => s + (m.total_calories ?? 0), 0)
  const totalProtein = filteredMeals.reduce((s, m) => s + (m.total_protein ?? 0), 0)
  const totalCarbs = filteredMeals.reduce((s, m) => s + (m.total_carbs ?? 0), 0)
  const totalFat = filteredMeals.reduce((s, m) => s + (m.total_fat ?? 0), 0)

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-4">
        <Link href="/diet" className="btn btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to diet
        </Link>
      </div>

      <AppHeroPanel
        eyebrow="N° 02 · Diet plan"
        title={plan.name}
        accent={plan.is_active ? 'active.' : 'review.'}
        subtitle={plan.notes && !plan.notes.startsWith('{') ? plan.notes : 'Meals, macros, water target, and substitutions for the selected day.'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {!plan.is_active && (
            <button
              onClick={handleSetActive}
              disabled={activating}
              className="btn btn-accent disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              <span>{activating ? 'Activating...' : 'Set as Active'}</span>
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-secondary disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
          </div>
        }
        meta={plan.is_active ? (
          <div className="app-status-pill">
            <Shield className="h-3 w-3" />
            Active plan
          </div>
        ) : undefined}
      />

      {/* Week Day Tabs */}
      {hasMultipleDays && (
        <WeekDayTabs
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          daySummaries={daySummaries}
        />
      )}

      {/* Daily Totals */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Calories"
          value={Math.round(totalCalories)}
          icon={<Flame className="h-4 w-4" />}
          tone="accent"
          footer={plan.target_calories ? `/ ${plan.target_calories}` : undefined}
        />
        <MetricCard label="Protein" value={Math.round(totalProtein)} unit="g" tone="success" />
        <MetricCard label="Carbs" value={Math.round(totalCarbs)} unit="g" tone="warn" />
        <MetricCard label="Fat" value={Math.round(totalFat)} unit="g" tone="danger" />
      </div>

      {/* Water Target */}
      {profile?.daily_water_ml && (
        <ListCard className="mb-6" eyebrow="WATER GOAL">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-[var(--brand-400)]" />
            <div>
              <span className="text-sm font-medium text-[var(--fg)]">Hydration target</span>
              <span className="ml-2 text-sm text-[var(--fg-3)]">{(profile.daily_water_ml / 1000).toFixed(1)}L / day</span>
            </div>
          </div>
        </ListCard>
      )}

      {/* Meals */}
      {filteredMeals.length === 0 ? (
        <EmptyStateCard
          icon={<Utensils className="h-7 w-7" />}
          title={hasMultipleDays && meals.length > 0 ? 'No meals for this day.' : 'No meals in this plan.'}
          body={hasMultipleDays && meals.length > 0 ? 'Select a different day to view meals.' : "This plan doesn't have any meals yet."}
        />
      ) : (
        <div className="space-y-4">
          {filteredMeals.map((meal) => {
            const isExpanded = expandedMeals.has(meal.id)
            const { meta, items } = parseFoods(meal.foods)
            const isLocked = isFreeUser && selectedMealId !== null && meal.id !== selectedMealId

            return (
              <div
                key={meal.id}
                className={`card overflow-hidden transition-all ${
                  isLocked ? 'opacity-80' : 'hover:border-[var(--line-strong)]'
                }`}
              >
                {/* Meal Header — always visible */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {meta.label && (
                        <span className="app-mono-label mb-1 block">
                          {meta.label}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[var(--fg)]">{meal.meal_name}</h3>
                        {isLocked && <Lock className="h-4 w-4 text-[var(--fg-4)]" />}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-[var(--fg-3)]">
                            {Math.round(meal.total_calories ?? 0)} cal
                            <span className="mx-1.5 text-[var(--fg-4)]">|</span>
                            {Math.round(meal.total_protein ?? 0)}P · {Math.round(meal.total_carbs ?? 0)}C · {Math.round(meal.total_fat ?? 0)}F
                          </p>
                        </div>
                      )}
                    </div>
                    {meta.time && (
                      <span className="app-status-pill flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {meta.time}
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--brand-400)] transition-colors hover:text-[var(--brand-500)]"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Upgrade to see this meal</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleMeal(meal.id)}
                      className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--brand-400)] transition-colors hover:text-[var(--brand-500)]"
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
                  <div className="border-t border-[var(--line)]">
                    {/* Notes / Observations */}
                    {(meta.notes || meta.timing_note) && (
                      <div className="border-b border-[var(--line)] bg-[var(--ink-2)] px-5 py-4">
                        <h4 className="mb-2 text-sm font-semibold text-[var(--fg)]">Notes</h4>
                        {meta.timing_note && (
                          <p className="mb-1 text-sm text-[var(--fg-2)]">{meta.timing_note}</p>
                        )}
                        {meta.notes && (
                          <p className="whitespace-pre-line text-sm text-[var(--fg-2)]">{meta.notes}</p>
                        )}
                      </div>
                    )}

                    {/* Ingredients checklist */}
                    {items.length > 0 && (
                      <div className="px-5 py-4">
                        <div className="space-y-1">
                          {items.map((food, idx) => (
                            <div key={idx} className="flex items-center gap-3 py-2.5">
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)]">
                                <Check className="h-4 w-4 text-[var(--brand-400)]" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--fg)]">
                                  {food.amount}{food.unit} {food.name}
                                </p>
                                <p className="text-xs text-[var(--fg-4)]">
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
                                  className="app-status-pill flex flex-shrink-0 items-center gap-1 text-xs"
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
          <div className="panel-strong w-full max-w-md overflow-hidden">
            <div className="border-b border-[var(--line)] px-6 py-5">
              <h3 className="text-lg font-bold text-[var(--fg)]">Choose a meal to unlock</h3>
              <p className="mt-1 text-sm text-[var(--fg-3)]">
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
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--ink-2)] p-3 text-left transition-all hover:border-[var(--brand-400)]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-100)]">
                      <Utensils className="h-4 w-4 text-[var(--brand-400)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {meta.label && (
                        <p className="text-xs font-semibold text-[var(--brand-400)]">{meta.label}</p>
                      )}
                      <p className="font-medium text-[var(--fg)]">{meal.meal_name}</p>
                      <p className="text-xs text-[var(--fg-3)]">
                        {Math.round(meal.total_calories ?? 0)} cal
                        {meta.time && ` · ${meta.time}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-6 pb-5">
              <p className="text-center text-xs text-[var(--fg-4)]">
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
          <div className="panel-strong max-h-[80vh] w-full max-w-md overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 border-b border-[var(--line)] bg-[var(--panel-strong)] px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--fg)]">Alternatives</h3>
                <button
                  onClick={() => setAlternativesModal(null)}
                  className="rounded-lg p-1 text-[var(--fg-3)] transition-colors hover:bg-[var(--ink-2)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--fg-3)]">
                You can substitute {alternativesModal.amount}{alternativesModal.unit} {alternativesModal.foodName} with:
              </p>
            </div>

            {/* Alternatives list */}
            <div className="px-6 py-4 space-y-3">
              {alternativesModal.alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--success-bg)]">
                    <Check className="h-4 w-4 text-[var(--ok)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--fg)]">
                    {alt.amount}{alt.unit} {alt.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Close button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setAlternativesModal(null)}
                className="btn btn-accent w-full"
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
