import { WEIGHT_INCREMENT_COMPOUND, WEIGHT_INCREMENT_ISOLATION } from './constants'
import type { WorkoutSetLog } from './supabase/types'

export function parseRepRange(reps: string): { min: number; max: number } {
  const parts = reps.split('-').map(s => parseInt(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] }
  }
  const single = parseInt(reps)
  if (!isNaN(single)) {
    return { min: single, max: single }
  }
  return { min: 8, max: 12 }
}

/**
 * Calculate progressive overload suggestion.
 * Returns suggested weight in kg, or null if no last data.
 */
export function calculateSuggestion(
  lastSets: WorkoutSetLog[],
  targetReps: string,
  isCompound: boolean,
): { suggestedWeight: number; reason: string } | null {
  if (!lastSets || lastSets.length === 0) return null

  const { max } = parseRepRange(targetReps)
  const lastWeight = lastSets[0]?.weight_kg ?? 0
  if (lastWeight === 0) return null

  const allHitMax = lastSets.every(s => s.reps >= max)
  const increment = isCompound ? WEIGHT_INCREMENT_COMPOUND : WEIGHT_INCREMENT_ISOLATION

  if (allHitMax) {
    return {
      suggestedWeight: lastWeight + increment,
      reason: `You hit ${max} reps on all sets last time — increase by ${increment}kg`,
    }
  }

  return {
    suggestedWeight: lastWeight,
    reason: 'Keep the same weight and aim for more reps',
  }
}
