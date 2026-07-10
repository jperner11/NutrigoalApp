import Link from 'next/link'

interface BrandLogoProps {
  href?: string
  /** Kept for API compatibility with the previous logo. */
  compact?: boolean
  tagline?: boolean
  light?: boolean
  size?: number
  className?: string
}

export default function BrandLogo({
  href,
  compact = false,
  tagline = false,
  light = false,
  size = 28,
  className = '',
}: BrandLogoProps) {
  const markSize = Math.max(30, Math.round(size * 1.18))
  const wordColor = light ? '#ffffff' : 'var(--foreground)'

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`.trim()}
      style={{ color: wordColor }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="var(--brand-500)" />
        <path
          d="M13 14.5H35"
          fill="none"
          stroke="#0a0a0a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M24 15V34"
          fill="none"
          stroke="#0a0a0a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M14 34C20 38 29.5 38 36 32"
          fill="none"
          stroke="#0a0a0a"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>

      {!compact && (
        <div className="min-w-0">
          <div
            className="font-display"
            style={{
              fontSize: Math.round(size * 0.95),
              letterSpacing: 0,
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            treno
          </div>
          {tagline && (
            <div
              className={`brand-tagline ${light ? 'brand-tagline-light' : ''}`}
              style={{ marginTop: 4 }}
            >
              one fitness app
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  )
}
