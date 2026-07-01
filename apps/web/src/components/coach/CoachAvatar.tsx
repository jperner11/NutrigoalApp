import Portrait from '@/components/ui/Portrait'

function initials(name: string | null) {
  return (name || 'C')
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Renders the coach's real photo when present, falling back to the decorative
// Portrait placeholder so a missing avatar never looks broken. Matches Portrait's
// box shape (full-width, rounded) so it drops into the same layout slots.
export default function CoachAvatar({
  avatarUrl,
  name,
  height = 220,
  seed = 0,
  className = '',
}: {
  avatarUrl: string | null | undefined
  name: string | null
  height?: number
  seed?: number
  className?: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name || 'Coach'}
        className={className}
        style={{
          width: '100%',
          height,
          objectFit: 'cover',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'block',
        }}
      />
    )
  }
  return <Portrait seed={seed} label={initials(name)} height={height} className={className} />
}
