'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Utensils, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import type { DietPlan, DietPlanMeal, FoodItem } from '@/lib/supabase/types'

interface MealPlanTrackerProps {
  userId: string
  onMacrosUpdate: (macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }) => void
}

export default function MealPlanTracker({ userId, onMacrosUpdate }: MealPlanTrackerProps) {
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null)
  const [meals, setMeals] = useState<DietPlanMeal[]>([])
  const [loggedMealIds, setLoggedMealIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()

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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (!activePlan) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Meals</h2>
        </div>
        <div className="text-center py-6">
          <Utensils className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No active diet plan. Create one to start tracking meals.</p>
          <Link
            href="/diet"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <span>Create Diet Plan</span>
          </Link>
        </div>
      </div>
    )
  }

  const mealsEaten = meals.filter(m => loggedMealIds.has(m.id)).length

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Meals</h2>
          <p className="text-sm text-gray-500">{activePlan.name} &middot; {mealsEaten}/{meals.length} completed</p>
        </div>
        <Link href="/diet" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
          View Plan
        </Link>
      </div>

      {meals.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No meals planned for today.</p>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => {
            const isEaten = loggedMealIds.has(meal.id)
            const isExpanded = expandedMeal === meal.id
            const foods = (meal.foods as FoodItem[]) ?? []

            return (
              <div
                key={meal.id}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isEaten ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center p-4">
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className={`rounded-lg p-2 ${isEaten ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Utensils className={`h-4 w-4 ${isEaten ? 'text-purple-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isEaten ? 'text-purple-800' : 'text-gray-900'}`}>
                        {meal.meal_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {meal.total_calories} cal &middot; {Math.round(meal.total_protein)}g P &middot; {Math.round(meal.total_carbs)}g C &middot; {Math.round(meal.total_fat)}g F
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleMeal(meal)}
                    className={`ml-3 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isEaten
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {isEaten && <Check className="h-4 w-4" />}
                  </button>
                </div>

                {isExpanded && foods.length > 0 && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {foods.map((food, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">
                            {food.amount} {food.unit} {food.name}
                          </span>
                          <span className="text-gray-400 ml-auto text-xs">
                            {food.calories} cal
                          </span>
                        </div>
                      ))}
                    </div>
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
