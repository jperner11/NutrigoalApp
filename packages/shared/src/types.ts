// Database types for NutriGoal v2

export type UserRole = 'free' | 'pro' | 'unlimited' | 'nutritionist' | 'nutritionist_client'
export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
export type FitnessGoal = 'bulking' | 'cutting' | 'maintenance'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type BodyPart = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'full_body'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band'
export type ClientStatus = 'active' | 'inactive' | 'pending'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type AIUsageType = 'meal_suggestion' | 'workout_suggestion'
export type FeedbackStatus = 'pending' | 'completed' | 'dismissed'
export type TrainingExperience = 'never' | 'beginner' | 'intermediate' | 'advanced'
export type EquipmentAccess = 'full_gym' | 'home_basic' | 'home_full' | 'bodyweight_only' | 'outdoor'
export type TrainingStyle = 'strength' | 'hypertrophy' | 'functional' | 'endurance' | 'mixed'
export type CookingSkill = 'none' | 'basic' | 'intermediate' | 'advanced'
export type MealPrepPreference = 'daily' | 'batch_prep' | 'quick_only' | 'eat_out'
export type WorkType = 'desk' | 'active' | 'hybrid' | 'remote'
export type SleepQuality = 'poor' | 'average' | 'good'
export type StressLevel = 'low' | 'moderate' | 'high'
export type GoalTimeline = 'steady' | '4_weeks' | '8_weeks' | '12_weeks' | '6_months'
export type SupplementFrequency = 'daily' | 'twice_daily' | 'three_times' | 'weekly' | 'as_needed'
export type SupplementTime = 'morning' | 'afternoon' | 'evening' | 'with_meals' | 'pre_workout' | 'post_workout' | 'bedtime'

// ─── Core Tables ────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  gender: Gender | null
  activity_level: ActivityLevel | null
  goal: FitnessGoal | null
  role: UserRole
  dietary_preferences: string[]
  allergies: string[]
  daily_calories: number | null
  daily_protein: number | null
  daily_carbs: number | null
  daily_fat: number | null
  daily_water_ml: number | null
  avatar_url: string | null
  onboarding_completed: boolean
  nutritionist_id: string | null
  // Schedule
  wake_time: string | null
  sleep_time: string | null
  workout_time: string | null
  work_start_time: string | null
  work_end_time: string | null
  workout_days_per_week: number | null
  meals_per_day: number | null
  // Health & medical
  injuries: string[]
  medical_conditions: string[]
  medications: string[]
  // Fitness background
  training_experience: TrainingExperience | null
  equipment_access: EquipmentAccess | null
  training_style: TrainingStyle[]
  // Nutrition background
  dietary_restrictions: string[]
  food_dislikes: string[]
  favourite_foods: string[]
  cooking_skill: CookingSkill | null
  meal_prep_preference: MealPrepPreference | null
  // Lifestyle
  work_type: WorkType | null
  sleep_quality: SleepQuality | null
  stress_level: StressLevel | null
  // Enhanced goals
  target_weight_kg: number | null
  goal_timeline: GoalTimeline | null
  motivation: string[]
  created_at: string
  updated_at: string
}

export interface NutritionistPackage {
  id: string
  nutritionist_id: string
  max_clients: number
  stripe_subscription_id: string | null
  created_at: string
}

export interface NutritionistClient {
  id: string
  nutritionist_id: string
  client_id: string | null
  status: ClientStatus
  invited_email: string | null
  created_at: string
}

export interface AIUsage {
  id: string
  user_id: string
  type: AIUsageType
  prompt: string
  response: string
  tokens_used: number
  created_at: string
}

// ─── Diet Tables ────────────────────────────────────────

export interface FoodItem {
  spoonacular_id: number
  name: string
  amount: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface DietPlan {
  id: string
  user_id: string
  created_by: string
  name: string
  start_date: string | null
  end_date: string | null
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fat: number | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface DietPlanMeal {
  id: string
  diet_plan_id: string
  day_of_week: number | null
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  diet_plan_meal_id: string | null
  logged_at: string
}

// ─── Training Tables ────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  body_part: BodyPart
  equipment: Equipment
  description: string | null
  image_url: string | null
  is_compound: boolean
  created_at: string
}

export interface TrainingPlan {
  id: string
  user_id: string
  created_by: string
  name: string
  description: string | null
  days_per_week: number
  is_active: boolean
  created_at: string
}

export interface TrainingPlanDay {
  id: string
  training_plan_id: string
  day_number: number
  name: string
}

export interface TrainingPlanExercise {
  id: string
  plan_day_id: string
  exercise_id: string
  order_index: number
  sets: number
  reps: string
  rest_seconds: number | null
  notes: string | null
}

export interface WorkoutSetLog {
  set_number: number
  reps: number
  weight_kg: number
  completed: boolean
}

export interface WorkoutExerciseLog {
  exercise_id: string
  exercise_name: string
  sets: WorkoutSetLog[]
}

export interface WorkoutLog {
  id: string
  user_id: string
  plan_day_id: string | null
  date: string
  exercises: WorkoutExerciseLog[]
  duration_minutes: number | null
  notes: string | null
  logged_at: string
}

// ─── Progress Tracking ─────────────────────────────────

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  body_fat_pct: number | null
  notes: string | null
  created_at: string
}

// ─── Cardio & Water Tables ──────────────────────────────

export interface CardioType {
  id: string
  name: string
  default_met: number
}

export interface CardioSession {
  id: string
  user_id: string
  created_by: string
  cardio_type_id: string
  date: string
  duration_minutes: number
  avg_bpm: number | null
  calories_burned: number
  is_prescribed: boolean
  is_completed: boolean
  notes: string | null
  logged_at: string
}

export interface WaterLog {
  id: string
  user_id: string
  date: string
  amount_ml: number
  logged_at: string
}

// ─── Subscription Tables ────────────────────────────────

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_type: UserRole
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// ─── Supplements & Pharma ──────────────────────────────

export interface UserSupplement {
  id: string
  user_id: string
  name: string
  dosage: string | null
  frequency: SupplementFrequency
  time_of_day: SupplementTime
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface SupplementLog {
  id: string
  user_id: string
  supplement_id: string
  date: string
  taken_at: string
}

// ─── Tier Gating ─────────────────────────────────────

export type TierSelectionType = 'meal' | 'training_day'

export interface UserTierSelection {
  id: string
  user_id: string
  selection_type: TierSelectionType
  selected_id: string
  created_at: string
}

// ─── Messaging & Feedback ──────────────────────────────

export interface Conversation {
  id: string
  nutritionist_id: string
  client_id: string
  last_message_at: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface FeedbackQuestion {
  id: string
  question: string
  type: 'text' | 'rating' | 'yes_no'
}

export interface FeedbackResponse {
  question_id: string
  answer: string | number | boolean
}

export interface FeedbackRequest {
  id: string
  nutritionist_id: string
  client_id: string
  title: string
  questions: FeedbackQuestion[]
  responses: FeedbackResponse[] | null
  status: FeedbackStatus
  created_at: string
  responded_at: string | null
}
