// Cardio calorie calculation using heart-rate-based formula (Keytel et al.)
// Falls back to MET-based calculation when BPM is not available

import type { Gender } from './types'

interface CardioCalorieParams {
  durationMinutes: number
  avgBpm: number | null
  weightKg: number
  age: number
  gender: Gender
  metValue: number // fallback MET value for the cardio type
}

/**
 * Calculate calories burned during a cardio session.
 *
 * When avg BPM is provided, uses the Keytel et al. heart-rate formula:
 * - Male:   ((age × 0.2017) + (weight × 0.1988) + (HR × 0.6309) - 55.0969) × minutes / 4.184
 * - Female: ((age × 0.074) - (weight × 0.1263) + (HR × 0.4472) - 20.4022) × minutes / 4.184
 *
 * When BPM is not available, falls back to MET-based formula:
 * - Calories = MET × weight_kg × (duration_minutes / 60)
 */
export function calculateCardioCalories({
  durationMinutes,
  avgBpm,
  weightKg,
  age,
  gender,
  metValue,
}: CardioCalorieParams): number {
  if (avgBpm && avgBpm > 0) {
    let calories: number

    if (gender === 'male') {
      calories =
        ((age * 0.2017 + weightKg * 0.1988 + avgBpm * 0.6309 - 55.0969) *
          durationMinutes) /
        4.184
    } else {
      calories =
        ((age * 0.074 - weightKg * 0.1263 + avgBpm * 0.4472 - 20.4022) *
          durationMinutes) /
        4.184
    }

    return Math.max(0, Math.round(calories))
  }

  // Fallback: MET-based calculation
  const hours = durationMinutes / 60
  return Math.round(metValue * weightKg * hours)
}
