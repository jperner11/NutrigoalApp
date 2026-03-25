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
} from 'lucide-react'
import type { DietPlan, DietPlanMeal, FoodItem } from '@/lib/supabase/types'

function getMealIcon(mealType: string) {
  switch (mealType) {
    case 'breakfast': return '🌅'
    case 'lunch': return '☀️'
    case 'dinner': return '🌙'
    case 'snack': return '🥜'
    default: return '🍽️'
  }
}

function getMealLabel(mealType: string) {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1)
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
      .order('created_at')

    setMeals(mealsData ?? [])
    // Expand all meals by default
    setExpandedMeals(new Set((mealsData ?? []).map(m => m.id)))
    setLoading(false)
  }, [profile, params.id, router])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

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

  const totalCalories = meals.reduce((s, m) => s + (m.total_calories ?? 0), 0)
  const totalProtein = meals.reduce((s, m) => s + (m.total_protein ?? 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + (m.total_carbs ?? 0), 0)
  const totalFat = meals.reduce((s, m) => s + (m.total_fat ?? 0), 0)

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
            {plan.notes && <p className="text-gray-600 mt-1">{plan.notes}</p>}
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
            {plan.target_protein && <p className="text-xs text-gray-400">/ {plan.target_protein}g</p>}
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Carbs</p>
            <p className="text-lg font-bold text-amber-700">{Math.round(totalCarbs)}g</p>
            {plan.target_carbs && <p className="text-xs text-gray-400">/ {plan.target_carbs}g</p>}
          </div>
          <div className="bg-rose-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-0.5">Fat</p>
            <p className="text-lg font-bold text-rose-700">{Math.round(totalFat)}g</p>
            {plan.target_fat && <p className="text-xs text-gray-400">/ {plan.target_fat}g</p>}
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
      {meals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No meals in this plan</h3>
          <p className="text-gray-500">This plan doesn&apos;t have any meals yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map((meal) => {
            const isExpanded = expandedMeals.has(meal.id)
            const foods = (meal.foods ?? []) as FoodItem[]

            return (
              <div
                key={meal.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
              >
                {/* Meal Header */}
                <button
                  onClick={() => toggleMeal(meal.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl">
                      {getMealIcon(meal.meal_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{meal.meal_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        <span>{getMealLabel(meal.meal_type)}</span>
                        <span>{foods.length} {foods.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{Math.round(meal.total_calories ?? 0)} cal</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(meal.total_protein ?? 0)}P · {Math.round(meal.total_carbs ?? 0)}C · {Math.round(meal.total_fat ?? 0)}F
                      </p>
                    </div>
                    <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-purple-100' : ''}`}>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-purple-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded: Ingredients */}
                {isExpanded && foods.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {/* Header row */}
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-2 pb-2 border-b border-gray-100">
                      <div className="col-span-5">Ingredient</div>
                      <div className="col-span-2 text-right">Cal</div>
                      <div className="col-span-1 text-right">P</div>
                      <div className="col-span-1 text-right">C</div>
                      <div className="col-span-1 text-right">F</div>
                      <div className="col-span-2"></div>
                    </div>
                    {foods.map((food, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="col-span-5">
                          <p className="text-sm font-medium text-gray-900">
                            {food.amount}{food.unit} {food.name}
                          </p>
                        </div>
                        <div className="col-span-2 text-right text-sm text-gray-700">{Math.round(food.calories)}</div>
                        <div className="col-span-1 text-right text-sm text-green-700">{Math.round(food.protein)}g</div>
                        <div className="col-span-1 text-right text-sm text-amber-700">{Math.round(food.carbs)}g</div>
                        <div className="col-span-1 text-right text-sm text-rose-700">{Math.round(food.fat)}g</div>
                        <div className="col-span-2"></div>
                      </div>
                    ))}
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
