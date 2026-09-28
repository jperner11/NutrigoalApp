'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import './globals.css'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'global' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--fg-3)]">Something broke</p>
            <h1 className="text-3xl font-semibold text-[var(--fg)]">Something went wrong.</h1>
            <p className="text-[var(--fg-2)]">The error has been logged. Please refresh and try again.</p>
          </div>
          <Link href="/" className="btn btn-ghost">
            Go home
          </Link>
        </div>
      </body>
    </html>
  )
}
