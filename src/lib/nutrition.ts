// Nutrition calculation utilities for NutriGoal

export interface UserMetrics {
  age: number
  height: number // in cm
  weight: number // in kg
  gender: 'male' | 'female'
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  goal: 'bulking' | 'cutting' | 'maintenance'
}

export interface NutritionTargets {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  water: number // ml
}

// BMR calculation using Mifflin-St Jeor equation
export function calculateBMR(age: number, height: number, weight: number, gender: 'male' | 'female'): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161
  }
}

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9
}

// Calculate TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(bmr: number, activityLevel: UserMetrics['activityLevel']): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel]
}

// Adjust calories for specific goals
export function adjustCaloriesForGoal(tdee: number, goal: UserMetrics['goal']): number {
  switch (goal) {
    case 'bulking':
      return Math.round(tdee + 300) // Add 300 calories for muscle gain
    case 'cutting':
      return Math.round(tdee - 500) // Subtract 500 calories for fat loss
    case 'maintenance':
      return Math.round(tdee)
    default:
      return Math.round(tdee)
  }
}

// Calculate macro distribution (protein, carbs, fat)
export function calculateMacros(calories: number, goal: UserMetrics['goal'], weight: number): {
  protein: number
  carbs: number
  fat: number
} {
  let proteinPerKg: number
  let fatPercent: number

  switch (goal) {
    case 'bulking':
      proteinPerKg = 2.0 // 2g per kg for muscle building
      fatPercent = 0.25 // 25% of calories from fat
      break
    case 'cutting':
      proteinPerKg = 2.2 // Higher protein for muscle preservation
      fatPercent = 0.20 // 20% of calories from fat
      break
    case 'maintenance':
      proteinPerKg = 1.8 // 1.8g per kg for maintenance
      fatPercent = 0.25 // 25% of calories from fat
      break
    default:
      proteinPerKg = 1.8
      fatPercent = 0.25
  }

  const protein = Math.round(weight * proteinPerKg)
  const fat = Math.round((calories * fatPercent) / 9) // 9 calories per gram of fat
  const remainingCalories = calories - (protein * 4) - (fat * 9)
  const carbs = Math.round(remainingCalories / 4) // 4 calories per gram of carbs

  return { protein, carbs, fat }
}

// Calculate daily water intake recommendation
export function calculateWaterIntake(weight: number): number {
  return Math.round(weight * 35) // 35ml per kg of body weight
}

// Main function to calculate all nutrition targets
export function calculateNutritionTargets(metrics: UserMetrics): NutritionTargets {
  const bmr = calculateBMR(metrics.age, metrics.height, metrics.weight, metrics.gender)
  const tdee = calculateTDEE(bmr, metrics.activityLevel)
  const calories = adjustCaloriesForGoal(tdee, metrics.goal)
  const macros = calculateMacros(calories, metrics.goal, metrics.weight)
  const water = calculateWaterIntake(metrics.weight)

  return {
    calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    water
  }
}

// Helper function to get activity level display name
export function getActivityLevelName(level: UserMetrics['activityLevel']): string {
  const names = {
    sedentary: 'Sedentary (little to no exercise)',
    lightly_active: 'Lightly Active (light exercise 1-3 days per week)',
    moderately_active: 'Moderately Active (moderate exercise 3-5 days per week)',
    very_active: 'Very Active (hard exercise 6-7 days per week)',
    extremely_active: 'Extremely Active (very hard exercise, physical job)'
  }
  return names[level]
}

// Helper function to get goal display name
export function getGoalName(goal: UserMetrics['goal']): string {
  const names = {
    bulking: 'Build Muscle (Bulking)',
    cutting: 'Lose Weight (Cutting)',
    maintenance: 'Maintain Current Weight'
  }
  return names[goal]
} 