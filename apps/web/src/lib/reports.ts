import { createClient } from '@/lib/supabase/client'

export interface WeeklyReport {
  period: string
  startDate: string
  endDate: string
  // Nutrition
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  targetCalories: number
  targetProtein: number
  mealsLogged: number
  daysWithMeals: number
  calorieAdherence: number // percentage
  // Training
  workoutsCompleted: number
  totalWorkoutMinutes: number
  cardioSessions: number
  totalCardioCalories: number
  // Weight
  startWeight: number | null
  endWeight: number | null
  weightChange: number | null
  // Water
  avgWaterMl: number
  targetWaterMl: number
  waterAdherence: number // percentage
  daysWithWater: number
}

export async function generateWeeklyReport(
  userId: string,
  startDate: string,
  endDate: string,
  targets: {
    calories: number | null
    protein: number | null
    waterMl: number | null
  }
): Promise<WeeklyReport> {
  const supabase = createClient()

  // Meal logs
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('date, total_calories, total_protein, total_carbs, total_fat')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  const mealDays = new Set(mealLogs?.map(l => l.date) ?? [])
  const totalCal = mealLogs?.reduce((s, l) => s + (l.total_calories || 0), 0) ?? 0
  const totalPro = mealLogs?.reduce((s, l) => s + (l.total_protein || 0), 0) ?? 0
  const totalCarbs = mealLogs?.reduce((s, l) => s + (l.total_carbs || 0), 0) ?? 0
  const totalFat = mealLogs?.reduce((s, l) => s + (l.total_fat || 0), 0) ?? 0
  const daysWithMeals = mealDays.size || 1

  // Workout logs
  const { data: workoutLogs } = await supabase
    .from('workout_logs')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Cardio sessions
  const { data: cardioSessions } = await supabase
    .from('cardio_sessions')
    .select('calories_burned')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .gte('date', startDate)
    .lte('date', endDate)

  // Weight logs
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('date, weight_kg')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // Water logs
  const { data: waterLogs } = await supabase
    .from('water_logs')
    .select('date, amount_ml')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  const waterByDay = new Map<string, number>()
  waterLogs?.forEach(l => {
    waterByDay.set(l.date, (waterByDay.get(l.date) ?? 0) + l.amount_ml)
  })
  const daysWithWater = waterByDay.size || 1
  const totalWater = Array.from(waterByDay.values()).reduce((s, v) => s + v, 0)

  const targetCal = targets.calories ?? 2000
  const targetPro = targets.protein ?? 150
  const targetWater = targets.waterMl ?? 2500

  const avgCalories = totalCal / daysWithMeals
  const calorieAdherence = targetCal > 0 ? Math.min(100, (avgCalories / targetCal) * 100) : 0

  const avgWater = totalWater / daysWithWater
  const waterAdherence = targetWater > 0 ? Math.min(100, (avgWater / targetWater) * 100) : 0

  const startWeight = weightLogs && weightLogs.length > 0 ? weightLogs[0].weight_kg : null
  const endWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null

  return {
    period: 'weekly',
    startDate,
    endDate,
    avgCalories: Math.round(avgCalories),
    avgProtein: Math.round(totalPro / daysWithMeals),
    avgCarbs: Math.round(totalCarbs / daysWithMeals),
    avgFat: Math.round(totalFat / daysWithMeals),
    targetCalories: targetCal,
    targetProtein: targetPro,
    mealsLogged: mealLogs?.length ?? 0,
    daysWithMeals,
    calorieAdherence: Math.round(calorieAdherence),
    workoutsCompleted: workoutLogs?.length ?? 0,
    totalWorkoutMinutes: workoutLogs?.reduce((s, l) => s + (l.duration_minutes || 0), 0) ?? 0,
    cardioSessions: cardioSessions?.length ?? 0,
    totalCardioCalories: cardioSessions?.reduce((s, l) => s + (l.calories_burned || 0), 0) ?? 0,
    startWeight,
    endWeight,
    weightChange: startWeight && endWeight ? Math.round((endWeight - startWeight) * 10) / 10 : null,
    avgWaterMl: Math.round(avgWater),
    targetWaterMl: targetWater,
    waterAdherence: Math.round(waterAdherence),
    daysWithWater,
  }
}
