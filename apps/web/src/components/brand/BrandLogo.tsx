'use client'

import Link from 'next/link'

interface BrandLogoProps {
  href?: string
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
  const color = light ? '#ffffff' : 'currentColor'
  const accentColor = light ? '#ffffff' : 'var(--acc)'

  const content = (
    <div
      className={`inline-flex items-center gap-3 ${className}`.trim()}
      style={{ color: light ? '#fff' : 'var(--foreground)' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 28V18a6 6 0 0112 0v10"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M22 28V18a6 6 0 0112 0v10"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M5 32h30"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="32" cy="9" r="3" fill={accentColor} />
      </svg>

      {!compact && (
        <div className="min-w-0">
          <div
            className="font-display"
            style={{
              fontSize: Math.round(size * 0.82),
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            meal
            <span style={{ fontStyle: 'italic', opacity: 0.78, fontWeight: 500 }}>&amp;</span>
            motion
          </div>
          {tagline && (
            <div
              className={`brand-tagline ${light ? 'brand-tagline-light' : ''}`}
              style={{ marginTop: 4 }}
            >
              feel your momentum
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
