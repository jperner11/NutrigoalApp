'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'global' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          The error has been logged. Please refresh and try again.
        </p>
        <Link href="/" style={{ color: '#0a0a0a', textDecoration: 'underline' }}>
          Go home
        </Link>
      </body>
    </html>
  )
}
