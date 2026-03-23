// Types
export type {
  UserRole,
  Gender,
  ActivityLevel,
  FitnessGoal,
  MealType,
  BodyPart,
  Equipment,
  ClientStatus,
  SubscriptionStatus,
  AIUsageType,
  UserProfile,
  NutritionistPackage,
  NutritionistClient,
  AIUsage,
  FoodItem,
  DietPlan,
  DietPlanMeal,
  MealLog,
  Exercise,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanExercise,
  WorkoutSetLog,
  WorkoutExerciseLog,
  WorkoutLog,
  CardioType,
  CardioSession,
  WaterLog,
  Subscription,
} from './types'

// Nutrition
export type { UserMetrics, NutritionTargets } from './nutrition'
export {
  calculateBMR,
  calculateTDEE,
  adjustCaloriesForGoal,
  calculateMacros,
  calculateWaterIntake,
  calculateNutritionTargets,
  getActivityLevelName,
  getGoalName,
} from './nutrition'

// Training
export { parseRepRange, calculateSuggestion } from './training'

// Cardio
export { calculateCardioCalories } from './cardio'

// Constants
export {
  PRICING,
  BODY_PARTS,
  EQUIPMENT_TYPES,
  CARDIO_TYPES,
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  MEAL_TYPES,
  WEIGHT_INCREMENT_COMPOUND,
  WEIGHT_INCREMENT_ISOLATION,
  DEFAULT_REST_SECONDS,
  DEFAULT_SETS,
  DEFAULT_REPS,
  WATER_QUICK_ADD,
} from './constants'
export type { PlanType } from './constants'
