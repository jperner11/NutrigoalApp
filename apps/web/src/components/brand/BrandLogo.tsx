'use client'

import Link from 'next/link'

interface BrandLogoProps {
  href?: string
  compact?: boolean
  light?: boolean
  className?: string
}

export default function BrandLogo({
  href,
  compact = false,
  light = false,
  className = '',
}: BrandLogoProps) {
  const content = (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <div className={`brand-mark ${light ? 'brand-mark-light' : ''}`}>
        <svg viewBox="0 0 64 64" aria-hidden="true" className="h-6 w-6">
          <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="5" />
          <circle cx="32" cy="32" r="7" fill="currentColor" className="brand-mark-core" />
          <path
            d="M18 32H24L29 22L35 42L40 32H48"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className={`brand-wordmark ${light ? 'brand-wordmark-light' : ''}`}>Nutrigoal</div>
          <div className={`brand-tagline ${light ? 'brand-tagline-light' : ''}`}>Performance clinic for nutrition and training</div>
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
