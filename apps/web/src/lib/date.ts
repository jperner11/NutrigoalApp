/**
 * Converts a JS `Date.getDay()` result (0=Sun..6=Sat) to the app's
 * Monday-indexed weekday convention (0=Mon..6=Sun), used for matching
 * `day_of_week` values on training/diet plan records.
 */
export function getMondayIndexedDay(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7
}
