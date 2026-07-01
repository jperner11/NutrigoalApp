// Coach-prescribed supplement plans (migration 048).
// Distinct from `user_supplements` (self-tracked) — these are coach-owned
// plans that the client reads in read-only mode.

export interface SupplementPlan {
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

export interface SupplementPlanItem {
  id: string
  plan_id: string
  supplement_name: string
  dosage: string | null
  unit: string | null
  /**
   * Free-form frequency descriptor. Coach may pass a single value or a
   * comma-separated list ("morning,evening") to express multiple times.
   */
  frequency: string | null
  /**
   * Free-form time-of-day descriptor (also supports comma-separated values).
   */
  time_of_day: string | null
  with_food: boolean
  notes: string | null
  sort_order: number
  created_at: string
}

export interface SupplementPlanWithItems extends SupplementPlan {
  items: SupplementPlanItem[]
}
