// NutriGoal v2 - App Constants

// ─── Pricing Tiers ──────────────────────────────────────

export const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    aiSuggestionsLimit: 1, // lifetime
    aiLimitType: 'lifetime' as const,
    features: [
      'Basic diet planning (manual)',
      'Water intake tracking',
      'Cardio logging',
      'View workout templates',
      '1 AI meal suggestion (lifetime)',
    ],
  },
  pro: {
    name: 'Pro',
    price: 14.99,
    aiSuggestionsLimit: 5, // per month
    aiLimitType: 'monthly' as const,
    features: [
      'Full diet planning with food search',
      'AI-powered meal suggestions (5/month)',
      'Custom workout plan builder',
      'Cardio tracking with analytics',
      'Water intake tracking',
      'Progress analytics',
    ],
  },
  nutritionist: {
    name: 'Nutritionist',
    price: 49.99,
    aiSuggestionsLimit: 20, // per month
    aiLimitType: 'monthly' as const,
    baseClients: 10,
    extraClientPrice: 3.99,
    features: [
      'Everything in Pro',
      'Client management (10 included)',
      'Create plans for clients',
      'Monitor client progress',
      'Prescribe cardio sessions',
      'AI suggestions (20/month)',
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

// ─── Water Quick-Add Options (ml) ───────────────────────

export const WATER_QUICK_ADD = [
  { amount: 250, label: '250ml' },
  { amount: 500, label: '500ml' },
  { amount: 750, label: '750ml' },
  { amount: 1000, label: '1L' },
] as const
