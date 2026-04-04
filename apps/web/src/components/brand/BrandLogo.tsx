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
          <path
            d="M15 43V28.5C15 23.806 18.806 20 23.5 20C28.194 20 32 23.806 32 28.5V43"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 43V30C32 24.477 36.477 20 42 20C47.523 20 52 24.477 52 30V43"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 45C21.5 49 42.5 49 47 45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.25"
            strokeLinecap="round"
            className="brand-mark-accent"
          />
          <circle cx="45.5" cy="18.5" r="3.5" fill="currentColor" className="brand-mark-accent" />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className={`brand-wordmark ${light ? 'brand-wordmark-light' : ''}`}>mealandmotion</div>
          <div className={`brand-tagline ${light ? 'brand-tagline-light' : ''}`}>feel your momentum</div>
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
