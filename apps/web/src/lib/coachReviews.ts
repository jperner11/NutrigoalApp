// Helpers for the coach review/rating layer.

// Public reviews show a first name + last initial only (privacy): "Marina S."
export function reviewerDisplayName(fullName: string | null): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Verified client'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

// "4.8" style label; null when there are no ratings yet.
export function formatRatingAverage(avg: number | null | undefined): string | null {
  if (avg == null || Number.isNaN(avg)) return null
  return avg.toFixed(1)
}

