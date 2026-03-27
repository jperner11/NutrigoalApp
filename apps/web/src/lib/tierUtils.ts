import type { UserRole } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

export type GatedFeature =
  | 'supplements'
  | 'cardio'
  | 'ai_suggestions'
  | 'meal_notes'
  | 'meal_alternatives'
  | 'full_meals'
  | 'full_training'
  | 'regenerate'

const PAID_ROLES: UserRole[] = ['pro', 'unlimited', 'nutritionist', 'nutritionist_client']
const AI_ROLES: UserRole[] = ['pro', 'unlimited', 'nutritionist']

const FEATURE_ACCESS: Record<GatedFeature, UserRole[]> = {
  supplements: PAID_ROLES,
  cardio: PAID_ROLES,
  ai_suggestions: AI_ROLES,
  meal_notes: PAID_ROLES,
  meal_alternatives: PAID_ROLES,
  full_meals: PAID_ROLES,
  full_training: PAID_ROLES,
  regenerate: AI_ROLES,
}

export function canAccess(role: UserRole, feature: GatedFeature): boolean {
  return FEATURE_ACCESS[feature].includes(role)
}

export function isFeatureLocked(role: UserRole, feature: GatedFeature): boolean {
  return !canAccess(role, feature)
}

/**
 * Returns the regeneration cooldown in days.
 * null = cannot regenerate (free, nutritionist_client)
 * 0 = unlimited (unlimited/nutritionist)
 * 7 = once per week (pro)
 */
export function getRegenCooldownDays(role: UserRole): number | null {
  switch (role) {
    case 'free': return null
    case 'nutritionist_client': return null
    case 'pro': return 7
    case 'unlimited':
    case 'nutritionist': return 0
    default: return null
  }
}

/**
 * Checks when the user can next regenerate plans.
 * Returns { canRegenerate, nextAvailableDate, daysRemaining }
 */
export async function checkRegenEligibility(
  userId: string,
  role: UserRole
): Promise<{ canRegenerate: boolean; daysRemaining: number }> {
  const cooldown = getRegenCooldownDays(role)

  // Free/nutritionist_client users can never regenerate
  if (cooldown === null) return { canRegenerate: false, daysRemaining: -1 }

  // Unlimited users can always regenerate
  if (cooldown === 0) return { canRegenerate: true, daysRemaining: 0 }

  // Pro users: check last generation within cooldown window
  const supabase = createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - cooldown)

  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['meal_suggestion', 'workout_suggestion'])
    .gte('created_at', cutoff.toISOString())

  if ((count ?? 0) === 0) {
    return { canRegenerate: true, daysRemaining: 0 }
  }

  // Find when the oldest usage in the window expires
  const { data: oldest } = await supabase
    .from('ai_usage')
    .select('created_at')
    .eq('user_id', userId)
    .in('type', ['meal_suggestion', 'workout_suggestion'])
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)

  if (oldest && oldest.length > 0) {
    const usageDate = new Date(oldest[0].created_at)
    const availableDate = new Date(usageDate)
    availableDate.setDate(availableDate.getDate() + cooldown)
    const remaining = Math.ceil((availableDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { canRegenerate: false, daysRemaining: Math.max(0, remaining) }
  }

  return { canRegenerate: true, daysRemaining: 0 }
}
