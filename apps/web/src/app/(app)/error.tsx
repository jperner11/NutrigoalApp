'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'app-segment' },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--fg-3)]">This page hit an error</p>
      <h2 className="text-2xl font-semibold text-[var(--fg-1)]">Something didn’t load.</h2>
      <p className="text-[var(--fg-2)]">The team has been notified. You can retry without leaving the page.</p>
      <button
        onClick={reset}
        className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
      >
        Retry
      </button>
    </div>
  )
}
