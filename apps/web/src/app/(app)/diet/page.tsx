'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  Utensils, Plus, Sparkles, Lightbulb, TrendingUp,
  Droplets, ArrowRightLeft, Pill, X,
} from 'lucide-react'
import Link from 'next/link'
import type { DietPlan, DietPlanMeal } from '@/lib/supabase/types'
import AppPageHeader from '@/components/ui/AppPageHeader'
import { isManagedClientRole } from '@nutrigoal/shared'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

interface MealMeta {
  label?: string
  time?: string
}

interface GroceryFood {
  name: string
  amount?: number
  unit?: string
}

interface CompanionContent {
  nutritionist_summary?: string
  calorie_warning?: string
  calorie_calculation?: string
  macro_explanation?: string
  personal_rules: string[]
  timeline: string
  hydration_target_litres?: string
  hydration_tips: string[]
  hydration_explanation: string
  snack_swaps: { current: string; swap: string; calories: number; why: string }[]
  supplement_recommendations?: { name: string; dose: string; timing: string; why: string; budget_option: string }[]
  supplement_note: string
}

function parseCompanionContent(notes: string | null | undefined): CompanionContent | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed && Array.isArray(parsed.personal_rules)) return parsed as CompanionContent
  } catch {
    // Not JSON
  }
  return null
}

function parseMealFoods(raw: unknown): { meta: MealMeta; items: GroceryFood[] } {
  if (!raw) return { meta: {}, items: [] }

  if (typeof raw === 'object' && raw !== null && '_meta' in raw) {
    const obj = raw as { _meta?: MealMeta; items?: GroceryFood[] }
    return { meta: obj._meta ?? {}, items: obj.items ?? [] }
  }

  if (Array.isArray(raw)) return { meta: {}, items: raw as GroceryFood[] }

  return { meta: {}, items: [] }
}

function formatMacros(calories: number | null | undefined, protein: number | null | undefined) {
  if (!calories && !protein) return 'Targets pending'
  return `${calories ? `${Math.round(calories)} kcal` : 'kcal pending'} · ${protein ? `${Math.round(protein)}P` : 'protein pending'}`
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7
}

function getDayMeals(meals: DietPlanMeal[], dayIndex: number) {
  const hasMultiDayMeals = meals.some(meal => meal.day_of_week !== null && meal.day_of_week !== undefined)
  return hasMultiDayMeals
    ? meals.filter(meal => meal.day_of_week === dayIndex)
    : dayIndex === getTodayIndex()
      ? meals
      : []
}

function buildGroceryItems(meals: DietPlanMeal[]) {
  const items = new Map<string, { name: string; amount: number; unit: string }>()

  meals.forEach(meal => {
    const { items: foods } = parseMealFoods(meal.foods)
    foods.forEach(food => {
      if (!food.name) return
      const unit = food.unit ?? ''
      const key = `${food.name.toLowerCase()}-${unit.toLowerCase()}`
      const existing = items.get(key)
      items.set(key, {
        name: food.name,
        unit,
        amount: (existing?.amount ?? 0) + (food.amount ?? 0),
      })
    })
  })

  return Array.from(items.values()).slice(0, 8)
}

export default function DietPage() {
  const { profile } = useUser()
  const [plans, setPlans] = useState<DietPlan[]>([])
  const [planMeals, setPlanMeals] = useState<DietPlanMeal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function loadPlans() {
      const { data } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })

      const loadedPlans = data ?? []
      setPlans(loadedPlans)

      const focusPlan = loadedPlans.find(plan => plan.is_active) ?? loadedPlans[0]
      if (focusPlan) {
        const { data: mealsData } = await supabase
          .from('diet_plan_meals')
          .select('*')
          .eq('diet_plan_id', focusPlan.id)

        setPlanMeals(mealsData ?? [])
      } else {
        setPlanMeals([])
      }

      setLoading(false)
    }

    loadPlans()
  }, [profile])

  if (loading) {
    return (
      <div className="card p-8">
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Preparing your diet plans.
        </div>
      </div>
    )
  }

  const activePlan = plans.find(p => p.is_active) ?? plans[0]
  const companion = activePlan ? parseCompanionContent(activePlan.notes) : null
  const managedClient = isManagedClientRole(profile?.role)
  const groceryItems = buildGroceryItems(planMeals)
  const todayIndex = getTodayIndex()

  return (
    <div>
      <AppPageHeader
        eyebrow="Nutrition"
        title="Diet"
        subtitle="Manage your meal plans and track your nutrition."
        actions={
          !managedClient ? (
            <Link href="/diet/new" className="btn btn-accent">
              <Plus className="h-4 w-4" />
              <span>New plan</span>
            </Link>
          ) : null
        }
      />

      {plans.length === 0 ? (
        <div className="card p-8 text-center sm:p-12">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--ink-3)', color: 'var(--acc)' }}
          >
            <Utensils className="h-6 w-6" />
          </div>
          <h3 className="serif" style={{ fontSize: 28, color: 'var(--fg)' }}>
            No diet plans yet.
          </h3>
          <p
            className="mx-auto mt-2 max-w-[520px]"
            style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            {managedClient
              ? 'Your trainer has not assigned a diet plan yet. It will appear here as soon as it is ready.'
              : 'Create your first diet plan to start tracking your nutrition.'}
          </p>
          {!managedClient && (
            <Link href="/diet/new" className="btn btn-accent mt-6">
              <Plus className="h-4 w-4" />
              <span>Create diet plan</span>
            </Link>
          )}
        </div>
      ) : activePlan ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <section>
              <div className="row mb-3 flex-wrap justify-between gap-3">
                <div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                  >
                    WEEK PLAN
                  </div>
                  <div className="serif mt-1" style={{ fontSize: 24, lineHeight: 1.15 }}>
                    {activePlan.name}{' '}
                    <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
                      this week.
                    </span>
                  </div>
                </div>
                <Link
                  href={`/diet/${activePlan.id}`}
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.1em' }}
                >
                  OPEN PLAN -&gt;
                </Link>
              </div>

              <div className="col gap-2">
                {DAY_LABELS.map((day, index) => {
                  const dayMeals = getDayMeals(planMeals, index)
                  const calories = dayMeals.reduce((sum, meal) => sum + (meal.total_calories ?? 0), 0)
                  const protein = dayMeals.reduce((sum, meal) => sum + (meal.total_protein ?? 0), 0)
                  const mealNames = dayMeals
                    .map(meal => parseMealFoods(meal.foods).meta.label || meal.meal_name)
                    .slice(0, 4)
                  const isToday = index === todayIndex

                  return (
                    <Link
                      key={day}
                      href={`/diet/${activePlan.id}`}
                      className="card-2 p-4"
                      style={{ borderColor: isToday ? 'var(--acc)' : undefined }}
                    >
                      <div className="row justify-between gap-4">
                        <div
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: isToday ? 'var(--acc)' : 'var(--fg-3)',
                            letterSpacing: '0.12em',
                          }}
                        >
                          {day.toUpperCase()}{isToday ? ' - TODAY' : ''}
                        </div>
                        <span
                          className="mono shrink-0"
                          style={{ fontSize: 11, color: 'var(--fg-3)' }}
                        >
                          {dayMeals.length > 0
                            ? formatMacros(calories, protein)
                            : formatMacros(activePlan.target_calories, activePlan.target_protein)}
                        </span>
                      </div>
                      <div
                        className="mt-1.5"
                        style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.45 }}
                      >
                        {mealNames.length > 0
                          ? mealNames.join(' · ')
                          : 'Open this plan to add meals and grocery items.'}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            <aside className="col gap-4">
              <div className="card p-5">
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                >
                  GROCERY
                </div>
                <div className="col mt-4 gap-3">
                  {groceryItems.length > 0 ? (
                    groceryItems.map(item => (
                      <label key={`${item.name}-${item.unit}`} className="row gap-3" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                        <input type="checkbox" className="h-3.5 w-3.5 rounded" />
                        <span>
                          {item.name}
                          {item.amount > 0 ? ` · ${Math.round(item.amount * 10) / 10}${item.unit}` : ''}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                      Grocery items will appear here once this plan has meals with ingredients.
                    </p>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <div
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                >
                  PLAN LIBRARY
                </div>
                <div className="col mt-4 gap-2">
                  {plans.map(plan => (
                    <Link key={plan.id} href={`/diet/${plan.id}`} className="card-2 p-3">
                      <div className="row justify-between gap-3">
                        <div className="min-w-0">
                          <div className="serif truncate" style={{ fontSize: 15, color: 'var(--fg)' }}>
                            {plan.name}
                          </div>
                          <div
                            className="mono mt-1"
                            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.08em' }}
                          >
                            {formatMacros(plan.target_calories, plan.target_protein)}
                          </div>
                        </div>
                        <div className="row shrink-0 gap-1">
                          {plan.created_by !== profile?.id && <span className="chip">FROM PT</span>}
                          {plan.is_active && <span className="chip" style={{ color: 'var(--acc)' }}>ACTIVE</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          {companion && (
            <section className="mt-8">
              <div className="row mb-3 gap-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--acc)' }} />
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
                >
                  COACHING INSIGHTS
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {companion.nutritionist_summary && (
                  <div className="card p-5 lg:col-span-2">
                    <div className="serif" style={{ fontSize: 22, color: 'var(--fg)' }}>
                      Nutritionist summary
                    </div>
                    <div
                      className="mt-3 whitespace-pre-line"
                      style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.65 }}
                    >
                      {companion.nutritionist_summary}
                    </div>
                  </div>
                )}

                {(companion.calorie_warning || companion.calorie_calculation || companion.macro_explanation) && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <Utensils className="h-4 w-4" style={{ color: 'var(--acc)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        How targets were set
                      </div>
                    </div>
                    {companion.calorie_warning && (
                      <div className="card-2 p-3" style={{ color: 'var(--warn)', fontSize: 13, lineHeight: 1.55 }}>
                        {companion.calorie_warning}
                      </div>
                    )}
                    {companion.calorie_calculation && (
                      <div
                        className="mt-3 whitespace-pre-line"
                        style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}
                      >
                        {companion.calorie_calculation}
                      </div>
                    )}
                    {companion.macro_explanation && (
                      <>
                        <div className="divider my-4" />
                        <div
                          className="mono mb-2"
                          style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                        >
                          MACRO BREAKDOWN
                        </div>
                        <div
                          className="whitespace-pre-line"
                          style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}
                        >
                          {companion.macro_explanation}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {companion.personal_rules?.length > 0 && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <Lightbulb className="h-4 w-4" style={{ color: 'var(--warn)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Personal rules
                      </div>
                    </div>
                    <ol className="col gap-2">
                      {companion.personal_rules.map((rule, index) => (
                        <li key={rule} className="row items-start gap-3" style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                          <span className="chip shrink-0">{index + 1}</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {companion.timeline && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <TrendingUp className="h-4 w-4" style={{ color: 'var(--ok)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Realistic timeline
                      </div>
                    </div>
                    <div
                      className="whitespace-pre-line"
                      style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}
                    >
                      {companion.timeline}
                    </div>
                  </div>
                )}

                {companion.hydration_tips?.length > 0 && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <Droplets className="h-4 w-4" style={{ color: 'var(--acc)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Hydration tips
                      </div>
                    </div>
                    {companion.hydration_target_litres && (
                      <span className="chip mb-3">{companion.hydration_target_litres}L TARGET</span>
                    )}
                    <ul className="col gap-2">
                      {companion.hydration_tips.map(tip => (
                        <li key={tip} style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                    {companion.hydration_explanation && (
                      <>
                        <div className="divider my-4" />
                        <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                          {companion.hydration_explanation}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {companion.snack_swaps?.length > 0 && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <ArrowRightLeft className="h-4 w-4" style={{ color: 'var(--acc)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Smarter snack swaps
                      </div>
                    </div>
                    <div className="col gap-3">
                      {companion.snack_swaps.map(swap => (
                        <div key={`${swap.current}-${swap.swap}`} className="card-2 p-3">
                          <div className="row items-start gap-3">
                            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--warn)' }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.45 }}>
                                <span className="line-through" style={{ color: 'var(--fg-4)' }}>
                                  {swap.current}
                                </span>
                                <span style={{ color: 'var(--fg-4)' }}> -&gt; </span>
                                <span style={{ color: 'var(--ok)' }}>{swap.swap}</span>
                                <span className="mono ml-2" style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                                  ~{swap.calories} cal
                                </span>
                              </p>
                              <p className="mt-1" style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                                {swap.why}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {companion.supplement_recommendations?.length ? (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <Pill className="h-4 w-4" style={{ color: 'var(--warn)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Supplement recommendations
                      </div>
                    </div>
                    <div className="col gap-3">
                      {companion.supplement_recommendations.map((supplement, index) => (
                        <div key={`${supplement.name}-${index}`} className="card-2 p-3">
                          <div className="serif" style={{ fontSize: 15, color: 'var(--fg)' }}>
                            {supplement.name}
                          </div>
                          <div
                            className="mono mt-1"
                            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                          >
                            {supplement.dose} · {supplement.timing}
                          </div>
                          <p className="mt-2" style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                            {supplement.why}
                          </p>
                          <p className="mt-2" style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                            Budget-friendly option: {supplement.budget_option}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {companion.supplement_note && (
                  <div className="card-2 p-5">
                    <div className="row mb-3 gap-2">
                      <Pill className="h-4 w-4" style={{ color: 'var(--warn)' }} />
                      <div className="serif" style={{ fontSize: 18, color: 'var(--fg)' }}>
                        Supplements - the 1%
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}>
                      {companion.supplement_note}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}
