// NutriGoal v2 - App Constants

// ─── Pricing Tiers ──────────────────────────────────────

export const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    regenCooldownDays: null as number | null, // no regeneration
    features: [
      'AI-generated meal & training plan',
      'View 1 meal of your choice',
      'View 1 training day of your choice',
      'Water intake tracking',
      'Weight logging',
    ],
  },
  pro: {
    name: 'Pro',
    price: 4.99,
    regenCooldownDays: 7, // 1x per week rolling
    features: [
      'Full meal plan access',
      'Full training plan access',
      'Regenerate plans 1×/week',
      'Cardio tracking',
      'Supplement tracking',
      'AI meal suggestions',
      'Meal notes & alternatives',
    ],
  },
  unlimited: {
    name: 'Unlimited',
    price: 9.99,
    regenCooldownDays: 0, // unlimited
    features: [
      'Everything in Pro',
      'Unlimited plan regeneration',
      'Priority AI generation',
    ],
  },
  nutritionist: {
    name: 'Nutritionist',
    price: 49.99,
    regenCooldownDays: 0, // unlimited
    baseClients: 10,
    extraClientPrice: 3.99,
    features: [
      'Everything in Unlimited',
      'Client management (10 included)',
      'Create plans for clients',
      'Monitor client progress',
      'Prescribe cardio sessions',
      'Additional clients at $3.99/mo each',
    ],
  },
} as const

export type PlanType = keyof typeof PRICING

// ─── Body Parts ─────────────────────────────────────────

export const BODY_PARTS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Full Body' },
] as const

// ─── Equipment Types ────────────────────────────────────

export const EQUIPMENT_TYPES = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'band', label: 'Resistance Band' },
] as const

// ─── Cardio Types ───────────────────────────────────────

export const CARDIO_TYPES = [
  { name: 'Running', met: 9.8 },
  { name: 'Cycling', met: 7.5 },
  { name: 'Swimming', met: 8.0 },
  { name: 'Rowing', met: 7.0 },
  { name: 'Elliptical', met: 5.0 },
  { name: 'Jump Rope', met: 12.3 },
  { name: 'Walking', met: 3.8 },
  { name: 'HIIT', met: 8.0 },
  { name: 'Stair Climbing', met: 9.0 },
  { name: 'Dancing', met: 5.5 },
] as const

// ─── Activity Levels ────────────────────────────────────

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'extremely_active', label: 'Extremely Active', description: 'Very hard exercise, physical job' },
] as const

// ─── Fitness Goals ──────────────────────────────────────

export const FITNESS_GOALS = [
  { value: 'bulking', label: 'Build Muscle', description: 'Caloric surplus for muscle gain' },
  { value: 'cutting', label: 'Lose Weight', description: 'Caloric deficit for fat loss' },
  { value: 'maintenance', label: 'Maintain', description: 'Keep current weight' },
] as const

// ─── Meal Types ─────────────────────────────────────────

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const

// ─── Anamnesis Options ─────────────────────────────────

export const TRAINING_EXPERIENCE = [
  { value: 'never', label: 'Never Trained', description: 'No gym or structured training experience' },
  { value: 'beginner', label: 'Beginner', description: 'Less than 1 year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', description: '3+ years of consistent training' },
] as const

export const EQUIPMENT_ACCESS = [
  { value: 'full_gym', label: 'Full Gym', description: 'Commercial gym with all equipment' },
  { value: 'home_full', label: 'Home Gym (Full)', description: 'Rack, barbell, dumbbells, bench' },
  { value: 'home_basic', label: 'Home Gym (Basic)', description: 'Dumbbells and/or bands only' },
  { value: 'bodyweight_only', label: 'Bodyweight Only', description: 'No equipment available' },
  { value: 'outdoor', label: 'Outdoor', description: 'Park, calisthenics bars, running' },
] as const

export const TRAINING_STYLES = [
  { value: 'strength', label: 'Strength', description: 'Heavy weights, low reps' },
  { value: 'hypertrophy', label: 'Hypertrophy', description: 'Moderate weights, 8-12 reps' },
  { value: 'functional', label: 'Functional', description: 'Movement-based, athletic' },
  { value: 'endurance', label: 'Endurance', description: 'High reps, cardio-focused' },
  { value: 'mixed', label: 'Mixed', description: 'Combination of styles' },
] as const

export const COMMON_INJURIES = [
  'Lower back pain', 'Shoulder impingement', 'Knee pain',
  'Tennis/golfer elbow', 'Wrist issues', 'Hip pain',
  'Ankle instability', 'Neck pain', 'Herniated disc',
] as const

export const COMMON_CONDITIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Hypertension',
  'Hypothyroidism', 'Hyperthyroidism', 'PCOS',
  'Asthma', 'Heart condition', 'High cholesterol',
] as const

export const DIETARY_RESTRICTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'lactose_free', label: 'Lactose-Free' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'low_fodmap', label: 'Low FODMAP' },
] as const

export const COMMON_FOOD_DISLIKES = [
  'Fish', 'Seafood', 'Eggs', 'Tofu', 'Mushrooms',
  'Broccoli', 'Spinach', 'Avocado', 'Nuts', 'Oats',
  'Sweet potato', 'Cottage cheese', 'Greek yogurt', 'Liver/organ meats',
] as const

export const COOKING_SKILLS = [
  { value: 'none', label: 'Can\'t Cook', description: 'Need no-cook or very simple meals' },
  { value: 'basic', label: 'Basic', description: 'Can follow simple recipes' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable in the kitchen' },
  { value: 'advanced', label: 'Advanced', description: 'Enjoy cooking complex meals' },
] as const

export const MEAL_PREP_PREFERENCES = [
  { value: 'daily', label: 'Cook Daily', description: 'Fresh meals each day' },
  { value: 'batch_prep', label: 'Meal Prep', description: 'Cook in bulk on weekends' },
  { value: 'quick_only', label: 'Quick Only', description: 'Max 15 min preparation' },
  { value: 'eat_out', label: 'Eat Out Often', description: 'Restaurant/delivery focused' },
] as const

export const WORK_TYPES = [
  { value: 'desk', label: 'Desk Job', description: 'Mostly sitting during work' },
  { value: 'active', label: 'Active Job', description: 'Physically demanding work' },
  { value: 'hybrid', label: 'Hybrid', description: 'Mix of desk and movement' },
  { value: 'remote', label: 'Remote', description: 'Work from home' },
] as const

export const SLEEP_QUALITY_OPTIONS = [
  { value: 'poor', label: 'Poor', description: 'Trouble falling/staying asleep' },
  { value: 'average', label: 'Average', description: 'Usually get decent sleep' },
  { value: 'good', label: 'Good', description: 'Consistent, restful sleep' },
] as const

export const STRESS_LEVELS = [
  { value: 'low', label: 'Low', description: 'Generally relaxed' },
  { value: 'moderate', label: 'Moderate', description: 'Normal day-to-day stress' },
  { value: 'high', label: 'High', description: 'Frequently stressed or anxious' },
] as const

export const GOAL_TIMELINES = [
  { value: 'steady', label: 'No Rush', description: 'Sustainable, long-term progress' },
  { value: '4_weeks', label: '4 Weeks', description: 'Short-term push' },
  { value: '8_weeks', label: '8 Weeks', description: 'Focused 2-month block' },
  { value: '12_weeks', label: '12 Weeks', description: 'Standard transformation' },
  { value: '6_months', label: '6 Months', description: 'Steady long-term plan' },
] as const

export const MOTIVATIONS = [
  'Look better', 'Health improvement', 'Sport performance',
  'More energy', 'Mental health', 'Injury recovery',
  'Doctor recommended', 'Event/competition',
] as const

export const SUPPLEMENT_FREQUENCIES = [
  { value: 'daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times', label: '3× daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As needed' },
] as const

export const SUPPLEMENT_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'with_meals', label: 'With meals' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'post_workout', label: 'Post-workout' },
  { value: 'bedtime', label: 'Bedtime' },
] as const

export const COMMON_SUPPLEMENTS = [
  'Multivitamin', 'Vitamin D', 'Vitamin C', 'Vitamin B12',
  'Omega-3 / Fish Oil', 'Magnesium', 'Zinc', 'Iron',
  'Calcium', 'Probiotics', 'Creatine', 'Whey Protein',
  'BCAA', 'Pre-workout', 'Melatonin', 'Collagen',
  'Ashwagandha', 'Caffeine pills', 'Glutamine',
] as const

// ─── Training Constants ────────────────────────────────

export const WEIGHT_INCREMENT_COMPOUND = 2.5 // kg
export const WEIGHT_INCREMENT_ISOLATION = 1.25 // kg
export const DEFAULT_REST_SECONDS = 90
export const DEFAULT_SETS = 3
export const DEFAULT_REPS = '8-12'

// ─── Water Quick-Add Options (ml) ───────────────────────

export const WATER_QUICK_ADD = [
  { amount: 250, label: '250ml' },
  { amount: 500, label: '500ml' },
  { amount: 750, label: '750ml' },
  { amount: 1000, label: '1L' },
] as const
