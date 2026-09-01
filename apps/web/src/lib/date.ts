/**
 * Converts a JS `Date.getDay()` result (0=Sun..6=Sat) to the app's
 * Monday-indexed weekday convention (0=Mon..6=Sun), used for matching
 * `day_of_week` values on training/diet plan records.
 */
export function getMondayIndexedDay(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7
}

/**
 * Formats a Date as a `YYYY-MM-DD` string in the local timezone. Unlike
 * `date.toISOString().split('T')[0]`, which converts to UTC first and can
 * roll the date to tomorrow for users west of UTC, this stays in local time.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
