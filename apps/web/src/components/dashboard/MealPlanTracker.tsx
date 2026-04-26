'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Utensils, ChevronDown, ChevronUp, Check, Clock, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { DietPlan, DietPlanMeal, FoodItem } from '@/lib/supabase/types'
import { isFeatureLocked } from '@/lib/tierUtils'
import type { UserRole } from '@/lib/supabase/types'

interface MealMeta {
  label?: string
  time?: string
  timing_note?: string
  notes?: string
}

function parseMealFoods(raw: DietPlanMeal['foods']): { meta: MealMeta; foods: FoodItem[] } {
  if (Array.isArray(raw)) return { meta: {}, foods: raw }

  if (typeof raw === 'object' && raw !== null && '_meta' in raw) {
    const wrapped = raw as { _meta?: MealMeta; items?: FoodItem[] }
    return { meta: wrapped._meta ?? {}, foods: wrapped.items ?? [] }
  }

  return { meta: {}, foods: [] }
}

function formatMealType(type: string) {
  return type.replace(/_/g, ' ').toUpperCase()
}

function formatMacroLine(meal: DietPlanMeal) {
  return `${Math.round(meal.total_calories)} KCAL · ${Math.round(meal.total_protein)}P · ${Math.round(meal.total_carbs)}C · ${Math.round(meal.total_fat)}F`
}

interface MealPlanTrackerProps {
  userId: string
  userRole?: UserRole
  onMacrosUpdate: (macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }) => void
}

export default function MealPlanTracker({ userId, userRole = 'free', onMacrosUpdate }: MealPlanTrackerProps) {
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null)
  const [meals, setMeals] = useState<DietPlanMeal[]>([])
  const [loggedMealIds, setLoggedMealIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  // Convert JS day (0=Sun) to our format (0=Mon): (jsDay + 6) % 7
  const dayOfWeek = (new Date().getDay() + 6) % 7
  const isFreeUser = isFeatureLocked(userRole, 'full_meals') && (activePlan?.is_ai_generated !== false)

  useEffect(() => {
    loadPlanAndLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadPlanAndLogs() {
    const supabase = createClient()

    // Get active diet plan
    const { data: plans } = await supabase
      .from('diet_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0) {
      setLoading(false)
      return
    }

    const plan = plans[0]
    setActivePlan(plan)

    // Get meals for this plan (matching today's day_of_week or null = every day)
    const { data: planMeals } = await supabase
      .from('diet_plan_meals')
      .select('*')
      .eq('diet_plan_id', plan.id)
      .or(`day_of_week.eq.${dayOfWeek},day_of_week.is.null`)

    setMeals(planMeals ?? [])

    // Get today's meal logs that reference this plan's meals
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('diet_plan_meal_id, total_calories, total_protein, total_carbs, total_fat')
      .eq('user_id', userId)
      .eq('date', today)
      .not('diet_plan_meal_id', 'is', null)

    const loggedIds = new Set<string>()
    let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0

    logs?.forEach(log => {
      if (log.diet_plan_meal_id) {
        loggedIds.add(log.diet_plan_meal_id)
      }
      totalCal += log.total_calories
      totalPro += log.total_protein ?? 0
      totalCarbs += log.total_carbs ?? 0
      totalFat += log.total_fat ?? 0
    })

    setLoggedMealIds(loggedIds)
    onMacrosUpdate({
      calories: totalCal,
      protein: totalPro,
      carbs: totalCarbs,
      fat: totalFat,
    })

    // Load free user's selected meal
    if (isFreeUser) {
      const { data: selection } = await supabase
        .from('user_tier_selections')
        .select('selected_id')
        .eq('user_id', userId)
        .eq('selection_type', 'meal')
        .single()

      if (selection) setSelectedMealId(selection.selected_id)
    }

    setLoading(false)
  }

  async function toggleMeal(meal: DietPlanMeal) {
    const supabase = createClient()
    const isCurrentlyLogged = loggedMealIds.has(meal.id)

    if (isCurrentlyLogged) {
      // Uncheck: delete the meal log
      const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', today)
        .eq('diet_plan_meal_id', meal.id)

      if (error) {
        toast.error('Failed to unlog meal')
        return
      }

      const newLogged = new Set(loggedMealIds)
      newLogged.delete(meal.id)
      setLoggedMealIds(newLogged)
      toast.success(`${meal.meal_name} unmarked`)
    } else {
      // Check: create a meal log from the plan meal
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: today,
        meal_type: meal.meal_type,
        foods: meal.foods,
        total_calories: meal.total_calories,
        total_protein: meal.total_protein,
        total_carbs: meal.total_carbs,
        total_fat: meal.total_fat,
        diet_plan_meal_id: meal.id,
      })

      if (error) {
        toast.error('Failed to log meal')
        return
      }

      const newLogged = new Set(loggedMealIds)
      newLogged.add(meal.id)
      setLoggedMealIds(newLogged)
      toast.success(`${meal.meal_name} logged!`)
    }

    // Recalculate macros
    const allMeals = meals
    let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0
    const updatedLogged = new Set(loggedMealIds)

    if (isCurrentlyLogged) {
      updatedLogged.delete(meal.id)
    } else {
      updatedLogged.add(meal.id)
    }

    allMeals.forEach(m => {
      if (updatedLogged.has(m.id)) {
        totalCal += m.total_calories
        totalPro += m.total_protein
        totalCarbs += m.total_carbs
        totalFat += m.total_fat
      }
    })

    onMacrosUpdate({
      calories: totalCal,
      protein: totalPro,
      carbs: totalCarbs,
      fat: totalFat,
    })
  }

  if (loading) {
    return (
      <div className="card mb-8 p-6">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          TODAY&apos;S MEALS
        </div>
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-5 w-1/3 rounded" style={{ background: 'var(--line)' }} />
          <div className="h-20 rounded-xl" style={{ background: 'var(--ink-2)' }} />
        </div>
      </div>
    )
  }

  if (!activePlan) {
    return (
      <div className="card mb-8 p-6">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          TODAY&apos;S MEALS
        </div>
        <div className="py-6 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Utensils className="h-5 w-5" />
          </div>
          <div className="serif" style={{ fontSize: 22, color: 'var(--fg)' }}>
            No active meal plan.
          </div>
          <p className="mx-auto mt-2 mb-5 max-w-[360px] text-sm leading-6" style={{ color: 'var(--fg-2)' }}>
            Create a diet plan to start tracking today&apos;s meals from your dashboard.
          </p>
          <Link
            href="/diet"
            className="btn btn-accent"
          >
            <span>Create Diet Plan</span>
          </Link>
        </div>
      </div>
    )
  }

  const mealsEaten = meals.filter(m => loggedMealIds.has(m.id)).length

  return (
    <div className="card mb-8 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
          >
            TODAY&apos;S MEALS
          </div>
          <h2 className="serif mt-1" style={{ fontSize: 24, lineHeight: 1.1, color: 'var(--fg)' }}>
            Plan,{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              plated.
            </span>
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>
            {activePlan.name} · {mealsEaten}/{meals.length} completed
          </p>
        </div>
        <Link href="/diet" className="btn btn-ghost">
          View Plan
        </Link>
      </div>

      {meals.length === 0 ? (
        <div className="card-2 px-4 py-6 text-sm" style={{ color: 'var(--fg-3)' }}>
          No meals planned for today.
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => {
            const isEaten = loggedMealIds.has(meal.id)
            const isExpanded = expandedMeal === meal.id
            const { meta, foods } = parseMealFoods(meal.foods)
            const mealLabel = meta.label || formatMealType(meal.meal_type)
            const kicker = `${mealLabel.toUpperCase()}${meta.time ? ` · ${meta.time}` : ''}`
            const isLocked = isFreeUser && selectedMealId !== null && meal.id !== selectedMealId

            return (
              <div
                key={meal.id}
                className={`card-2 overflow-hidden transition ${isLocked ? 'opacity-60' : ''}`}
                style={{
                  borderColor: isEaten ? 'var(--acc)' : 'var(--line)',
                  background: isEaten ? 'var(--ink-3)' : undefined,
                }}
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => !isLocked && setExpandedMeal(isExpanded ? null : meal.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    disabled={isLocked}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: isEaten ? 'var(--acc-soft)' : 'var(--ink-2)', color: isEaten ? 'var(--acc)' : 'var(--fg-3)' }}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Utensils className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {!isLocked && (
                        <p
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                        >
                          {kicker}
                        </p>
                      )}
                      <p className="serif truncate" style={{ fontSize: 18, color: isLocked ? 'var(--fg-3)' : 'var(--fg)', lineHeight: 1.2 }}>
                        {meal.meal_name}
                      </p>
                      {!isLocked && (
                        <p
                          className="mono mt-1"
                          style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}
                        >
                          {formatMacroLine(meal)}
                        </p>
                      )}
                    </div>
                    {!isLocked && (isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--fg-3)' }} />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--fg-3)' }} />
                    ))}
                  </button>

                  {!isLocked && (
                    <button
                      onClick={() => toggleMeal(meal)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition"
                      style={{
                        borderColor: isEaten ? 'var(--acc)' : 'var(--line-2)',
                        background: isEaten ? 'var(--acc)' : 'var(--ink-2)',
                        color: isEaten ? 'var(--ink-1)' : 'var(--fg-3)',
                      }}
                      aria-label={isEaten ? `Unmark ${meal.meal_name}` : `Mark ${meal.meal_name} eaten`}
                    >
                      {isEaten && <Check className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {isExpanded && !isLocked && (
                  <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--line)' }}>
                    {(meta.timing_note || meta.notes) && (
                      <div className="mt-3 rounded-xl p-3 text-sm leading-6" style={{ background: 'var(--ink-2)', color: 'var(--fg-2)' }}>
                        {meta.timing_note && <p>{meta.timing_note}</p>}
                        {meta.notes && <p>{meta.notes}</p>}
                      </div>
                    )}
                    {foods.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {foods.map((food, i) => (
                        <div key={`${food.name}-${i}`} className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 shrink-0" style={{ color: 'var(--fg-4)' }} />
                          <span style={{ color: 'var(--fg-2)' }}>
                            {food.amount} {food.unit} {food.name}
                          </span>
                          <span className="mono ml-auto text-xs" style={{ color: 'var(--fg-4)' }}>
                            {Math.round(food.calories)} KCAL
                          </span>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
