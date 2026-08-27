'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'root' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--fg-3)]">Something broke</p>
        <h1 className="text-3xl font-semibold text-[var(--fg)]">We caught the error and logged it.</h1>
        <p className="text-[var(--fg-2)]">Try the action again, or head back home. The team will see this in our error tracker.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-accent">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  )
}
