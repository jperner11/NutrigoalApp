'use client'

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
  tagline = false,
  light = false,
  size = 28,
  className = '',
}: BrandLogoProps) {
  const content = (
    <div
      className={`inline-flex items-center ${className}`.trim()}
      style={{ color: light ? '#fff' : 'var(--foreground)' }}
    >
      <div className="min-w-0">
        <div
          className="font-display"
          style={{
            fontSize: Math.round(size * 0.95),
            letterSpacing: '-0.05em',
            lineHeight: 1,
            fontWeight: 700,
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
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  )
}
