'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Dumbbell, Utensils, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { checkRegenEligibility, getRegenCooldownDays } from '@/lib/tierUtils'

type StepStatus = 'pending' | 'loading' | 'done' | 'error'

interface GenerationStep {
  label: string
  icon: React.ReactNode
  status: StepStatus
  error?: string
}

export default function GeneratePlansPage() {
  const router = useRouter()
  const { profile } = useUser()
  const startedRef = useRef(false)

  const [steps, setSteps] = useState<GenerationStep[]>([
    { label: 'Generating your training plan', icon: <Dumbbell className="h-5 w-5" />, status: 'pending' },
    { label: 'Generating your meal plan', icon: <Utensils className="h-5 w-5" />, status: 'pending' },
    { label: 'Saving your plans', icon: <Sparkles className="h-5 w-5" />, status: 'pending' },
  ])

  const updateStep = (index: number, update: Partial<GenerationStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s))
  }

  useEffect(() => {
    if (!profile || startedRef.current) return
    if (!profile.daily_calories || !profile.daily_protein) return
    startedRef.current = true

    generateAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function generateAll() {
    if (!profile) return

    // Check regeneration eligibility (skip for first-time onboarding — no existing plans)
    const cooldown = getRegenCooldownDays(profile.role)
    if (cooldown !== null && profile.onboarding_completed) {
      // Not first generation — check if user can regenerate
      const { canRegenerate, daysRemaining } = await checkRegenEligibility(profile.id, profile.role)
      if (!canRegenerate) {
        if (cooldown === null) {
          toast.error('Plan regeneration requires a Pro plan or higher.')
        } else {
          toast.error(`You can regenerate plans in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`)
        }
        router.push('/dashboard')
        return
      }
    }

    // Step 1 & 2: Generate both plans in parallel
    updateStep(0, { status: 'loading' })
    updateStep(1, { status: 'loading' })

    const [trainingResult, mealResult] = await Promise.allSettled([
      generateTrainingPlan(),
      generateMealPlan(),
    ])

    const trainingPlan = trainingResult.status === 'fulfilled' ? trainingResult.value : null
    const mealPlan = mealResult.status === 'fulfilled' ? mealResult.value : null

    if (trainingResult.status === 'rejected') {
      updateStep(0, { status: 'error', error: 'Failed to generate training plan' })
    } else {
      updateStep(0, { status: 'done' })
    }

    if (mealResult.status === 'rejected') {
      updateStep(1, { status: 'error', error: 'Failed to generate meal plan' })
    } else {
      updateStep(1, { status: 'done' })
    }

    if (!trainingPlan && !mealPlan) {
      toast.error('Failed to generate plans. Please try again from the dashboard.')
      setTimeout(() => router.push('/dashboard'), 2000)
      return
    }

    // Step 3: Save to database
    updateStep(2, { status: 'loading' })
    try {
      const supabase = createClient()

      if (trainingPlan) {
        await saveTrainingPlan(supabase, trainingPlan)
      }
      if (mealPlan) {
        console.log('Meal plan data to save:', JSON.stringify(mealPlan).slice(0, 500))
        await saveMealPlan(supabase, mealPlan)
      }

      // Log AI usage for cooldown tracking
      if (trainingPlan) {
        await supabase.from('ai_usage').insert({
          user_id: profile!.id,
          type: 'workout_suggestion',
          prompt: 'generate-training-plan',
          response: 'success',
          tokens_used: 0,
        })
      }
      if (mealPlan) {
        await supabase.from('ai_usage').insert({
          user_id: profile!.id,
          type: 'meal_suggestion',
          prompt: 'generate-meal-plan',
          response: 'success',
          tokens_used: 0,
        })
      }

      updateStep(2, { status: 'done' })
      toast.success('Your personalized plans are ready!')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch {
      updateStep(2, { status: 'error', error: 'Failed to save plans' })
      toast.error('Failed to save plans. Please try again.')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  async function generateTrainingPlan() {
    const res = await fetch('/api/ai/generate-training-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: profile!.goal ?? 'maintenance',
        daysPerWeek: profile!.workout_days_per_week ?? 4,
        gender: profile!.gender ?? 'male',
        age: profile!.age ?? 30,
        weight_kg: profile!.weight_kg ?? 70,
        activityLevel: profile!.activity_level ?? 'moderately_active',
        workoutTime: profile!.workout_time ?? '08:00',
        trainingExperience: profile!.training_experience ?? 'beginner',
        equipmentAccess: profile!.equipment_access ?? 'full_gym',
        trainingStyles: profile!.training_style ?? ['hypertrophy'],
        injuries: profile!.injuries ?? [],
        medicalConditions: profile!.medical_conditions ?? [],
        stressLevel: profile!.stress_level ?? 'moderate',
        sleepQuality: profile!.sleep_quality ?? 'average',
      }),
    })

    if (!res.ok) throw new Error('Training plan generation failed')
    return res.json()
  }

  async function generateMealPlan() {
    const res = await fetch('/api/ai/generate-meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calories: profile!.daily_calories,
        protein: profile!.daily_protein,
        carbs: profile!.daily_carbs,
        fat: profile!.daily_fat,
        goal: profile!.goal ?? 'maintenance',
        gender: profile!.gender,
        weight_kg: profile!.weight_kg,
        age: profile!.age,
        mealsPerDay: profile!.meals_per_day ?? 3,
        wakeTime: profile!.wake_time ?? '07:00',
        workoutTime: profile!.workout_time ?? '08:00',
        dietaryRestrictions: profile!.dietary_restrictions ?? [],
        allergies: profile!.allergies ?? [],
        foodDislikes: profile!.food_dislikes ?? [],
        favouriteFoods: profile!.favourite_foods ?? [],
        cookingSkill: profile!.cooking_skill ?? 'intermediate',
        mealPrepPreference: profile!.meal_prep_preference ?? 'daily',
        medicalConditions: profile!.medical_conditions ?? [],
        medications: profile!.medications ?? [],
        stressLevel: profile!.stress_level ?? 'moderate',
        sleepQuality: profile!.sleep_quality ?? 'average',
        targetWeight: profile!.target_weight_kg,
      }),
    })

    if (!res.ok) throw new Error('Meal plan generation failed')
    return res.json()
  }

  interface TrainingPlanResponse {
    name: string
    description: string
    days: {
      day_number: number
      name: string
      exercises: {
        exercise_id?: string
        name: string
        body_part: string
        equipment: string
        sets: number
        reps: string
        rest_seconds: number
        notes?: string
      }[]
    }[]
  }

  async function saveTrainingPlan(supabase: ReturnType<typeof createClient>, data: TrainingPlanResponse) {
    // Deactivate existing active plans
    await supabase
      .from('training_plans')
      .update({ is_active: false })
      .eq('user_id', profile!.id)
      .eq('is_active', true)

    // Create plan
    const { data: plan, error: planError } = await supabase
      .from('training_plans')
      .insert({
        user_id: profile!.id,
        created_by: profile!.id,
        name: data.name || 'AI Training Plan',
        description: data.description || null,
        days_per_week: data.days?.length ?? profile!.workout_days_per_week ?? 4,
        is_active: true,
      })
      .select()
      .single()

    if (planError || !plan) throw new Error('Failed to save training plan')

    for (const day of (data.days ?? [])) {
      const { data: planDay, error: dayError } = await supabase
        .from('training_plan_days')
        .insert({
          training_plan_id: plan.id,
          day_number: day.day_number,
          name: day.name,
        })
        .select()
        .single()

      if (dayError || !planDay) continue

      // Resolve exercise IDs — use server-provided ID or create client-side
      const validBodyParts = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'full_body'])
      const validEquipment = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'])

      const exerciseInserts = []
      for (let idx = 0; idx < day.exercises.length; idx++) {
        const ex = day.exercises[idx]
        let exerciseId = ex.exercise_id

        if (!exerciseId) {
          // Fallback: create exercise client-side
          const bodyPart = validBodyParts.has(ex.body_part) ? ex.body_part : 'full_body'
          const equip = validEquipment.has(ex.equipment) ? ex.equipment : 'bodyweight'
          const { data: newEx } = await supabase
            .from('exercises')
            .insert({
              name: ex.name,
              body_part: bodyPart,
              equipment: equip,
              is_compound: idx < 3,
            })
            .select('id')
            .single()

          if (newEx) exerciseId = newEx.id
        }

        if (exerciseId) {
          exerciseInserts.push({
            plan_day_id: planDay.id,
            exercise_id: exerciseId,
            order_index: idx,
            sets: ex.sets || 3,
            reps: ex.reps || '8-12',
            rest_seconds: ex.rest_seconds || 90,
            notes: ex.notes || null,
          })
        }
      }

      if (exerciseInserts.length > 0) {
        await supabase.from('training_plan_exercises').insert(exerciseInserts)
      }
    }
  }

  interface MealPlanMeal {
    meal_type: string
    title: string
    time?: string
    timing_note?: string
    notes?: string
    ingredients: {
      name: string
      amount: number
      unit: string
      calories: number
      protein: number
      carbs: number
      fat: number
      alternatives?: { name: string; amount: number; unit: string }[]
    }[]
    calories: number
    protein: number
    carbs: number
    fat: number
  }

  async function saveMealPlan(supabase: ReturnType<typeof createClient>, data: { meals: MealPlanMeal[] }) {
    // Deactivate existing active plans
    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('user_id', profile!.id)
      .eq('is_active', true)

    const { data: plan, error: planError } = await supabase
      .from('diet_plans')
      .insert({
        user_id: profile!.id,
        created_by: profile!.id,
        name: `${profile!.full_name?.split(' ')[0] || 'My'}'s AI Meal Plan`,
        target_calories: profile!.daily_calories,
        target_protein: profile!.daily_protein,
        target_carbs: profile!.daily_carbs,
        target_fat: profile!.daily_fat,
        is_active: true,
      })
      .select()
      .single()

    if (planError || !plan) throw new Error('Failed to save diet plan')

    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
    const mealInserts = (data.meals ?? []).map(meal => ({
      diet_plan_id: plan.id,
      day_of_week: null,
      meal_type: VALID_MEAL_TYPES.includes(meal.meal_type) ? meal.meal_type : 'snack',
      meal_name: meal.title || 'Meal',
      foods: {
        _meta: {
          time: meal.time || '12:00',
          timing_note: meal.timing_note || '',
          notes: meal.notes || '',
        },
        items: meal.ingredients.map(ing => ({
          spoonacular_id: 0,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit || 'g',
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          alternatives: ing.alternatives ?? [],
        })),
      },
      total_calories: Math.round(meal.calories || 0),
      total_protein: Math.round((meal.protein || 0) * 10) / 10,
      total_carbs: Math.round((meal.carbs || 0) * 10) / 10,
      total_fat: Math.round((meal.fat || 0) * 10) / 10,
    }))

    if (mealInserts.length > 0) {
      const { error: mealsError } = await supabase.from('diet_plan_meals').insert(mealInserts)
      if (mealsError) {
        console.error('Failed to insert meals:', mealsError)
        throw new Error('Failed to save meals: ' + mealsError.message)
      }
    } else {
      console.warn('No meals to insert — data.meals was empty:', data)
    }
  }

  const allDone = steps.every(s => s.status === 'done')
  const hasError = steps.some(s => s.status === 'error')

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto text-center">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg shadow-purple-500/25">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {allDone ? 'Your plans are ready!' : hasError ? 'Almost there...' : 'Creating your personalized plans'}
          </h1>
          <p className="text-gray-600 mt-2">
            {allDone
              ? 'Redirecting to your dashboard...'
              : 'Using your profile to build the perfect training and nutrition plans.'}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-left">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 ${
                step.status === 'done'
                  ? 'bg-green-50 border-green-200'
                  : step.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : step.status === 'loading'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className={`flex-shrink-0 ${
                step.status === 'done' ? 'text-green-600'
                  : step.status === 'error' ? 'text-red-500'
                  : step.status === 'loading' ? 'text-purple-600'
                  : 'text-gray-400'
              }`}>
                {step.status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : step.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.status === 'done' ? 'text-green-800'
                    : step.status === 'error' ? 'text-red-800'
                    : step.status === 'loading' ? 'text-purple-800'
                    : 'text-gray-500'
                }`}>
                  {step.status === 'done'
                    ? step.label.replace('Generating', 'Generated').replace('Saving', 'Saved')
                    : step.label}
                </p>
                {step.error && (
                  <p className="text-xs text-red-600 mt-0.5">{step.error}</p>
                )}
              </div>
              {step.status === 'loading' && (
                <div className="w-16 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Manual redirect if auto-redirect doesn't work */}
        {(allDone || hasError) && (
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-8 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
