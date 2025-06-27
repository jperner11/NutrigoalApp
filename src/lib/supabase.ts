import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Database types
export interface UserProfile {
  id: string
  email: string
  age: number
  height: number
  weight: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  goal: 'bulking' | 'cutting' | 'maintenance'
  dietary_preferences: string[]
  allergies: string[]
  daily_calories: number
  daily_water: number
  is_premium: boolean
  created_at: string
  updated_at: string
}

export interface MealPlan {
  id: string
  user_id: string
  date: string
  meals: {
    breakfast: string[]
    lunch: string[]
    dinner: string[]
    snacks: string[]
  }
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  created_at: string
} 