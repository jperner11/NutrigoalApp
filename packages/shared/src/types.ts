// Database types for NutriGoal v2

export type UserRole =
  | 'free'
  | 'pro'
  | 'unlimited'
  | 'nutritionist'
  | 'nutritionist_client'
  | 'personal_trainer'
  | 'personal_trainer_client'
export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
export type FitnessGoal = 'bulking' | 'cutting' | 'maintenance'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type BodyPart = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'full_body'
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band'
export type ClientStatus = 'active' | 'inactive' | 'pending'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type AIUsageType = 'meal_suggestion' | 'workout_suggestion' | 'coaching'
export type FeedbackStatus = 'pending' | 'completed' | 'dismissed'
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'
export type CoachLeadStatus = 'pending' | 'accepted' | 'declined' | 'archived'
export type CoachLeadStage = 'new' | 'contacted' | 'consult_booked' | 'won' | 'lost'
export type CoachOfferBillingPeriod = 'one_time' | 'weekly' | 'monthly'
export type TrainingExperience = 'never' | 'beginner' | 'intermediate' | 'advanced'
export type EquipmentAccess = 'full_gym' | 'home_basic' | 'home_full' | 'bodyweight_only' | 'outdoor'
export type TrainingStyle = 'strength' | 'hypertrophy' | 'functional' | 'endurance' | 'mixed'
export type CookingSkill = 'none' | 'basic' | 'intermediate' | 'advanced'
export type MealPrepPreference = 'daily' | 'batch_prep' | 'quick_only' | 'eat_out'
export type WorkType = 'desk' | 'active' | 'hybrid' | 'remote'
export type SleepQuality = 'poor' | 'average' | 'good'
export type StressLevel = 'low' | 'moderate' | 'high'
export type GoalTimeline = 'steady' | '4_weeks' | '8_weeks' | '12_weeks' | '6_months'
export type AlcoholFrequency = 'none' | 'light' | 'moderate' | 'heavy'
export type SnackMotivation = 'hunger' | 'boredom' | 'habit' | 'mixed'
export type SnackPreference = 'sweet' | 'savoury' | 'both'
export type SecondaryTrainingGoal = 'mobility' | 'conditioning' | 'sport_performance' | 'injury_rehab' | 'posture' | 'none'
export type PlanPreference = 'structured' | 'balanced' | 'flexible'
export type HarderDays = 'weekdays' | 'weekends' | 'both'
export type EatingOutFrequency = 'rarely' | 'sometimes' | 'often' | 'very_often'
export type SupplementFrequency = 'daily' | 'twice_daily' | 'three_times' | 'weekly' | 'as_needed'
export type SupplementTime = 'morning' | 'afternoon' | 'evening' | 'with_meals' | 'pre_workout' | 'post_workout' | 'bedtime'
export type CoachCheckInFrequency = 'weekly' | 'biweekly' | 'monthly' | 'as_needed'
export type CoachStyle = 'structured' | 'balanced' | 'flexible'
export type CoachPostIntakeAction = 'review_and_plan' | 'message_first' | 'book_consult' | 'send_assessment'
export type CoachAppFocus = 'client_management' | 'prospecting' | 'both'
export type CustomIntakeQuestionType = 'short_text' | 'long_text' | 'single_select' | 'multi_select' | 'yes_no'

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
  personal_trainer_id: string | null
  // Schedule
  wake_time: string | null
  sleep_time: string | null
  workout_time: string | null
  work_start_time: string | null
  work_end_time: string | null
  workout_days_per_week: number | null
  meals_per_day: number | null
  breakfast_time: string | null
  lunch_time: string | null
  dinner_time: string | null
  // Health & medical
  injuries: string[]
  medical_conditions: string[]
  medications: string[]
  // Fitness background
  years_training: number | null
  body_fat_pct: number | null
  training_experience: TrainingExperience | null
  equipment_access: EquipmentAccess | null
  training_style: TrainingStyle[]
  secondary_training_goal: SecondaryTrainingGoal | null
  max_session_minutes: number | null
  squat_1rm: number | null
  bench_1rm: number | null
  deadlift_1rm: number | null
  ohp_1rm: number | null
  // Nutrition background
  dietary_restrictions: string[]
  food_dislikes: string[]
  favourite_foods: string[]
  cooking_skill: CookingSkill | null
  meal_prep_preference: MealPrepPreference | null
  // Lifestyle
  work_type: WorkType | null
  sleep_quality: SleepQuality | null
  sleep_hours: number | null
  stress_level: StressLevel | null
  alcohol_frequency: AlcoholFrequency | null
  alcohol_details: string | null
  // Snack habits
  current_snacks: string[]
  snack_motivation: SnackMotivation | null
  snack_preference: SnackPreference | null
  late_night_snacking: boolean
  // Cardio preferences
  does_cardio: boolean
  cardio_types_preferred: string[]
  cardio_frequency_per_week: number | null
  cardio_duration_minutes: number | null
  // Food preferences
  food_adventurousness: number | null
  // Enhanced goals
  target_weight_kg: number | null
  goal_timeline: GoalTimeline | null
  motivation: string[]
  desired_outcome: string | null
  past_dieting_challenges: string | null
  weekly_derailers: string | null
  plan_preference: PlanPreference | null
  harder_days: HarderDays | null
  eating_out_frequency: EatingOutFrequency | null
  // Trainer onboarding
  coach_specialties: string[]
  coach_ideal_client: string | null
  coach_services: string[]
  coach_formats: string[]
  coach_check_in_frequency: CoachCheckInFrequency | null
  coach_style: CoachStyle | null
  coach_intake_requirements: string[]
  coach_post_intake_action: CoachPostIntakeAction | null
  coach_app_focus: CoachAppFocus | null
  trial_ends_at: string | null
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

export interface PersonalTrainerPackage {
  id: string
  personal_trainer_id: string
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

export interface PersonalTrainerClient {
  id: string
  personal_trainer_id: string
  client_id: string | null
  status: ClientStatus
  invited_email: string | null
  created_at: string
}

export interface PersonalTrainerInvite {
  id: string
  personal_trainer_id: string
  invited_email: string
  client_first_name: string | null
  status: InviteStatus
  invite_token: string
  delivery_method: 'invite' | 'magiclink'
  invited_user_id: string | null
  accepted_at: string | null
  declined_at: string | null
  revoked_at: string | null
  expires_at: string
  last_sent_at: string
  created_at: string
  updated_at: string
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

export interface PersonalTrainerCustomIntakeQuestion {
  id: string
  trainer_id: string
  label: string
  help_text: string | null
  type: CustomIntakeQuestionType
  options: string[]
  required: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PersonalTrainerCustomIntakeResponse {
  id: string
  question_id: string
  trainer_id: string
  client_id: string
  response_text: string | null
  response_json: string[] | boolean | null
  created_at: string
  updated_at: string
}

export interface CoachPublicProfile {
  coach_id: string
  slug: string
  is_public: boolean
  headline: string | null
  bio: string | null
  location_label: string | null
  consultation_url: string | null
  price_from: number | null
  price_to: number | null
  currency: string
  accepting_new_clients: boolean
  created_at: string
  updated_at: string
}

export interface CoachOffer {
  id: string
  coach_id: string
  title: string
  description: string | null
  price: number
  billing_period: CoachOfferBillingPeriod
  cta_label: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CoachLead {
  id: string
  coach_id: string
  user_id: string
  status: CoachLeadStatus
  stage: CoachLeadStage
  goal_summary: string
  message: string | null
  budget_label: string | null
  preferred_format: string | null
  experience_level: TrainingExperience | null
  selected_offer_id: string | null
  selected_offer_title: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

// ─── Diet Tables ────────────────────────────────────────

export type FoodSource = 'spoonacular' | 'openfoodfacts' | 'custom' | 'ai_parsed'

export interface FoodItem {
  spoonacular_id?: number
  food_id?: string
  source?: FoodSource
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
  is_ai_generated: boolean
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
  is_ai_generated: boolean
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

// ─── Progress Photos & Measurements ─────────────────────

export type PhotoPose = 'front' | 'side' | 'back'

export interface ProgressPhoto {
  id: string
  user_id: string
  date: string
  photo_url: string
  pose: PhotoPose
  notes: string | null
  created_at: string
}

export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  neck: number | null
  shoulders: number | null
  chest: number | null
  left_arm: number | null
  right_arm: number | null
  waist: number | null
  hips: number | null
  left_thigh: number | null
  right_thigh: number | null
  left_calf: number | null
  right_calf: number | null
  notes: string | null
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

// ─── Training Check-ins ────────────────────────────────

export interface ExerciseProgress {
  exercise_name: string
  exercise_id: string
  first_weight: number
  last_weight: number
  weight_change: number
  best_weight: number
  total_sets: number
  avg_reps: number
  sessions_logged: number
  trend: 'improving' | 'stalled' | 'declining'
}

export interface TrainingCheckIn {
  id: string
  user_id: string
  training_plan_id: string | null
  check_in_date: string
  period_start: string
  period_end: string
  workouts_logged: number
  workouts_planned: number
  exercise_progress: ExerciseProgress[]
  ai_summary: string | null
  ai_recommendations: string | null
  created_at: string
}
