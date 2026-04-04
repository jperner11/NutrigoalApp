'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Sparkles, Dumbbell, Utensils, CheckCircle2, AlertCircle, Loader2, Pill, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { checkRegenEligibility, getRegenCooldownDays } from '@/lib/tierUtils'
import { isManagedClientRole } from '@nutrigoal/shared'

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

  // Managed clients cannot regenerate plans directly.
  useEffect(() => {
    if (isManagedClientRole(profile?.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  const [steps, setSteps] = useState<GenerationStep[]>([
    { label: 'Generating your training plan', icon: <Dumbbell className="h-5 w-5" />, status: 'pending' },
    { label: 'Generating your 7-day meal plan', icon: <Utensils className="h-5 w-5" />, status: 'pending' },
    { label: 'Personalising your coaching insights', icon: <Sparkles className="h-5 w-5" />, status: 'pending' },
    { label: 'Saving everything', icon: <CheckCircle2 className="h-5 w-5" />, status: 'pending' },
  ])
  const [mealDayProgress, setMealDayProgress] = useState(0)
  const [savedTraining, setSavedTraining] = useState(false)
  const [savedMealPlan, setSavedMealPlan] = useState(false)
  const [savedSupplements, setSavedSupplements] = useState(false)

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
    if (profile.onboarding_completed) {
      const cooldown = getRegenCooldownDays(profile.role)
      if (cooldown === null) {
        // Free or managed-client: cannot regenerate at all
        toast.error('Plan regeneration requires a Pro plan or higher.')
        router.push('/dashboard')
        return
      }
      // Pro/Unlimited/Trainer: check cooldown
      const { canRegenerate, daysRemaining } = await checkRegenEligibility(profile.id, profile.role)
      if (!canRegenerate) {
        toast.error(`You can regenerate plans in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`)
        router.push('/dashboard')
        return
      }
    }

    // Step 1: Generate training plan
    updateStep(0, { status: 'loading' })
    let trainingPlan = null
    try {
      trainingPlan = await generateTrainingPlan()
      updateStep(0, { status: 'done' })
    } catch {
      updateStep(0, { status: 'error', error: 'Failed to generate training plan' })
    }

    // Step 2: Generate 7-day meal plan (day by day)
    updateStep(1, { status: 'loading' })
    let weekMealPlan: { meals: MealPlanMeal[]; dayOfWeek: number }[] | null = null
    try {
      weekMealPlan = await generateWeekMealPlan()
      updateStep(1, { status: 'done' })
    } catch {
      updateStep(1, { status: 'error', error: 'Failed to generate meal plan' })
    }

    // Step 3: Generate companion content (rules, timeline, hydration tips, snack swaps)
    updateStep(2, { status: 'loading' })
    let companionContent: CompanionContent | null = null
    try {
      companionContent = await generateCompanionContent()
      updateStep(2, { status: 'done' })
    } catch {
      updateStep(2, { status: 'error', error: 'Failed to generate coaching insights' })
    }

    if (!trainingPlan && !weekMealPlan) {
      toast.error('Failed to generate plans. Please try again from the dashboard.')
      setTimeout(() => router.push('/dashboard'), 2000)
      return
    }

    // Step 4: Save to database
    updateStep(3, { status: 'loading' })
    try {
      const supabase = createClient()

      if (trainingPlan) {
        await saveTrainingPlan(supabase, trainingPlan)
        setSavedTraining(true)
      }
      if (weekMealPlan) {
        await saveWeekMealPlan(supabase, weekMealPlan)
        setSavedMealPlan(true)
      }

      const companionSupplements: SavedSupplementRecommendation[] = (companionContent?.supplement_recommendations ?? []).map((s) => ({
        name: s.name,
        dose: s.dose,
        timing: s.timing,
        reason: `${s.why}${s.budget_option ? ` Budget-friendly option: ${s.budget_option}.` : ''}`,
      }))

      const mergedSupplementMap = new Map<string, SavedSupplementRecommendation>()
      ;(aiSupplements ?? []).forEach((s) => {
        mergedSupplementMap.set(s.name.trim().toLowerCase(), s)
      })
      companionSupplements.forEach((s) => {
        mergedSupplementMap.set(s.name.trim().toLowerCase(), s)
      })
      const supplementsToSave = Array.from(mergedSupplementMap.values())

      if (supplementsToSave.length > 0) {
        await supabase
          .from('user_supplements')
          .update({ is_active: false })
          .eq('user_id', profile!.id)
          .like('notes', 'AI recommended%')

        const supplementRows = supplementsToSave.map((s) => ({
          user_id: profile!.id,
          name: s.name,
          dosage: s.dose,
          frequency: 'daily' as const,
          time_of_day: s.timing.toLowerCase().includes('morning') ? 'morning' as const
            : s.timing.toLowerCase().includes('bed') || s.timing.toLowerCase().includes('evening') ? 'bedtime' as const
            : s.timing.toLowerCase().includes('pre') ? 'pre_workout' as const
            : s.timing.toLowerCase().includes('post') ? 'post_workout' as const
            : 'with_meals' as const,
          notes: `AI recommended — ${s.reason}`,
          is_active: true,
        }))

        await supabase.from('user_supplements').insert(supplementRows)
        setSavedSupplements(true)
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
      if (weekMealPlan) {
        await supabase.from('ai_usage').insert({
          user_id: profile!.id,
          type: 'meal_suggestion',
          prompt: 'generate-meal-plan-7day',
          response: 'success',
          tokens_used: 0,
        })
      }

      // Save companion content to the diet plan's notes field
      if (companionContent) {
        const { data: activePlan } = await supabase
          .from('diet_plans')
          .select('id')
          .eq('user_id', profile!.id)
          .eq('is_active', true)
          .single()

        if (activePlan) {
          await supabase
            .from('diet_plans')
            .update({ notes: JSON.stringify(companionContent) })
            .eq('id', activePlan.id)
        }
      }

      updateStep(3, { status: 'done' })
    } catch {
      updateStep(3, { status: 'error', error: 'Failed to save plans' })
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
        height_cm: profile!.height_cm ?? 175,
        activityLevel: profile!.activity_level ?? 'moderately_active',
        workoutTime: profile!.workout_time ?? '08:00',
        trainingExperience: profile!.training_experience ?? 'beginner',
        equipmentAccess: profile!.equipment_access ?? 'full_gym',
        trainingStyles: profile!.training_style ?? ['hypertrophy'],
        injuries: profile!.injuries ?? [],
        medicalConditions: profile!.medical_conditions ?? [],
        stressLevel: profile!.stress_level ?? 'moderate',
        sleepQuality: profile!.sleep_quality ?? 'average',
        sleepHours: profile!.sleep_hours ?? 7,
        secondaryTrainingGoal: profile!.secondary_training_goal ?? 'none',
        maxSessionMinutes: profile!.max_session_minutes ?? 60,
        squat1rm: profile!.squat_1rm ?? null,
        bench1rm: profile!.bench_1rm ?? null,
        deadlift1rm: profile!.deadlift_1rm ?? null,
        ohp1rm: profile!.ohp_1rm ?? null,
        desiredOutcome: profile!.desired_outcome ?? '',
        pastDietingChallenges: profile!.past_dieting_challenges ?? '',
        weeklyDerailers: profile!.weekly_derailers ?? '',
        planPreference: profile!.plan_preference ?? 'balanced',
        harderDays: profile!.harder_days ?? 'weekends',
      }),
    })

    if (!res.ok) throw new Error('Training plan generation failed')
    return res.json()
  }

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  async function generateMealPlanDay(dayIndex: number) {
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
        workStartTime: profile!.work_start_time ?? '09:00',
        workEndTime: profile!.work_end_time ?? '17:00',
        sleepTime: profile!.sleep_time ?? '23:00',
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
        sleepHours: profile!.sleep_hours,
        targetWeight: profile!.target_weight_kg,
        workType: profile!.work_type ?? 'desk',
        alcoholFrequency: profile!.alcohol_frequency ?? 'none',
        alcoholDetails: profile!.alcohol_details ?? '',
        foodAdventurousness: profile!.food_adventurousness ?? 5,
        currentSnacks: profile!.current_snacks ?? [],
        snackMotivation: profile!.snack_motivation ?? 'hunger',
        snackPreference: profile!.snack_preference ?? 'both',
        lateNightSnacking: profile!.late_night_snacking ?? false,
        harderDays: profile!.harder_days ?? 'weekends',
        eatingOutFrequency: profile!.eating_out_frequency ?? 'sometimes',
        planPreference: profile!.plan_preference ?? 'balanced',
        weeklyDerailers: profile!.weekly_derailers ?? '',
        desiredOutcome: profile!.desired_outcome ?? '',
        pastDietingChallenges: profile!.past_dieting_challenges ?? '',
        workoutDaysPerWeek: profile!.workout_days_per_week ?? 4,
        activityLevel: profile!.activity_level ?? 'moderately_active',
        breakfastTime: profile!.breakfast_time ?? '08:00',
        lunchTime: profile!.lunch_time ?? '12:30',
        dinnerTime: profile!.dinner_time ?? '19:00',
        height_cm: profile!.height_cm,
        dayName: DAY_NAMES[dayIndex],
        dayIndex,
      }),
    })

    if (!res.ok) throw new Error(`Meal plan generation failed for ${DAY_NAMES[dayIndex]}`)
    return res.json()
  }

  const [aiSupplements, setAiSupplements] = useState<{ name: string; dose: string; timing: string; reason: string }[] | null>(null)

  async function generateWeekMealPlan(): Promise<{ meals: MealPlanMeal[]; dayOfWeek: number }[]> {
    const results: { meals: MealPlanMeal[]; dayOfWeek: number }[] = []

    // Generate days sequentially to avoid rate limits and keep progress visible
    for (let day = 0; day < 7; day++) {
      setMealDayProgress(day + 1)
      const data = await generateMealPlanDay(day)
      results.push({ meals: data.meals, dayOfWeek: day })
      // Capture supplement recommendations from first day
      if (day === 0 && data.supplements) {
        setAiSupplements(data.supplements)
      }
    }

    return results
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
        is_ai_generated: true,
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

interface SavedSupplementRecommendation {
  name: string
  dose: string
  timing: string
  reason: string
}

  async function generateCompanionContent(): Promise<CompanionContent> {
    const res = await fetch('/api/ai/meal-plan-companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calories: profile!.daily_calories,
        protein: profile!.daily_protein,
        carbs: profile!.daily_carbs,
        fat: profile!.daily_fat,
        goal: profile!.goal ?? 'maintenance',
        gender: profile!.gender ?? 'male',
        weight_kg: profile!.weight_kg ?? 70,
        age: profile!.age ?? 30,
        height_cm: profile!.height_cm ?? 175,
        activityLevel: profile!.activity_level ?? 'moderately_active',
        workType: profile!.work_type ?? 'desk',
        workoutDaysPerWeek: profile!.workout_days_per_week ?? 4,
        sleepHours: profile!.sleep_hours ?? 7,
        sleepQuality: profile!.sleep_quality ?? 'average',
        stressLevel: profile!.stress_level ?? 'moderate',
        alcoholFrequency: profile!.alcohol_frequency ?? 'none',
        alcoholDetails: profile!.alcohol_details ?? '',
        currentSnacks: profile!.current_snacks ?? [],
        snackMotivation: profile!.snack_motivation ?? 'hunger',
        snackPreference: profile!.snack_preference ?? 'both',
        lateNightSnacking: profile!.late_night_snacking ?? false,
        targetWeight: profile!.target_weight_kg ?? null,
        dailyWaterMl: profile!.daily_water_ml ?? 2500,
        goalTimeline: profile!.goal_timeline ?? 'steady',
        favouriteFoods: profile!.favourite_foods ?? [],
        foodDislikes: profile!.food_dislikes ?? [],
        dietaryRestrictions: profile!.dietary_restrictions ?? [],
        cookingSkill: profile!.cooking_skill ?? 'intermediate',
        mealPrepPreference: profile!.meal_prep_preference ?? 'daily',
        motivation: profile!.motivation ?? [],
        desiredOutcome: profile!.desired_outcome ?? '',
        pastDietingChallenges: profile!.past_dieting_challenges ?? '',
        weeklyDerailers: profile!.weekly_derailers ?? '',
        planPreference: profile!.plan_preference ?? 'balanced',
        harderDays: profile!.harder_days ?? 'weekends',
        eatingOutFrequency: profile!.eating_out_frequency ?? 'sometimes',
      }),
    })

    if (!res.ok) throw new Error('Companion content generation failed')
    return res.json()
  }

  interface MealPlanMeal {
    meal_type: string
    label?: string
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

  async function saveWeekMealPlan(
    supabase: ReturnType<typeof createClient>,
    weekData: { meals: MealPlanMeal[]; dayOfWeek: number }[]
  ) {
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
        is_ai_generated: true,
      })
      .select()
      .single()

    if (planError || !plan) throw new Error('Failed to save diet plan')

    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
    const allMealInserts = weekData.flatMap(({ meals, dayOfWeek }) =>
      (meals ?? []).map(meal => ({
        diet_plan_id: plan.id,
        day_of_week: dayOfWeek,
        meal_type: VALID_MEAL_TYPES.includes(meal.meal_type) ? meal.meal_type : 'snack',
        meal_name: meal.title || 'Meal',
        foods: {
          _meta: {
            label: meal.label || '',
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
    )

    if (allMealInserts.length > 0) {
      const { error: mealsError } = await supabase.from('diet_plan_meals').insert(allMealInserts)
      if (mealsError) {
        throw new Error('Failed to save meals: ' + mealsError.message)
      }
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
          {!allDone && (
            <p className="text-gray-600 mt-2">
              Using your profile to build the perfect training and nutrition plans.
            </p>
          )}
        </div>

        {/* Steps — hide once all done */}
        {!allDone && (
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
                      : step.status === 'loading' && i === 1 && mealDayProgress > 0
                      ? `Generating day ${mealDayProgress} of 7...`
                      : step.label}
                  </p>
                  {step.error && (
                    <p className="text-xs text-red-600 mt-0.5">{step.error}</p>
                  )}
                </div>
                {step.status === 'loading' && (
                  <div className="w-16 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: i === 1 && mealDayProgress > 0 ? `${Math.round((mealDayProgress / 7) * 100)}%` : '60%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Success overview — show where everything was saved */}
        {allDone && (
          <div className="space-y-3 text-left">
            <p className="text-sm text-gray-500 mb-4 text-center">Here&apos;s where to find everything:</p>

            {savedMealPlan && (
              <Link href="/diet" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors group">
                <Utensils className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">7-Day Meal Plan</p>
                  <p className="text-xs text-green-600">View your meals, macros, and coaching insights</p>
                </div>
                <ArrowRight className="h-4 w-4 text-green-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {savedTraining && (
              <Link href="/training" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors group">
                <Dumbbell className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-purple-800">Training Plan</p>
                  <p className="text-xs text-purple-600">Your personalised workout programme</p>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {savedSupplements && (
              <Link href="/supplements" className="flex items-center gap-4 px-5 py-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors group">
                <Pill className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Supplement Recommendations</p>
                  <p className="text-xs text-amber-600">Evidence-based suggestions added to your Supplements tab</p>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            <div className="pt-4">
              <Link
                href="/dashboard"
                className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Error state — show dashboard button */}
        {hasError && !allDone && (
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
