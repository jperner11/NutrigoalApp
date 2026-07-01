// Coach cardio plan types — prescriptive weekly cardio programmes.
// These are distinct from ad-hoc CardioSession logs (which remain unchanged).

export type CardioPlanIntensity = 'easy' | 'moderate' | 'hard' | 'interval'

export interface CardioPlan {
  id: string
  coach_id: string
  client_id: string
  name: string
  notes: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CardioPlanSession {
  id: string
  plan_id: string
  day_of_week: number // 0-6 (Sun..Sat)
  type: string
  duration_minutes: number
  intensity: string
  target_zone: string | null
  target_hr_min: number | null
  target_hr_max: number | null
  notes: string | null
  sort_order: number
}

export interface CardioPlanSessionInput {
  day_of_week: number
  type: string
  duration_minutes: number
  intensity?: string
  target_zone?: string | null
  target_hr_min?: number | null
  target_hr_max?: number | null
  notes?: string | null
  sort_order?: number
}

export interface CardioPlanInput {
  client_id: string
  name: string
  notes?: string | null
  start_date?: string
  end_date?: string | null
  is_active?: boolean
  sessions?: CardioPlanSessionInput[]
}
