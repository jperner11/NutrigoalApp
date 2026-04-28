import * as Sentry from '@sentry/nextjs'

export async function register() {
  console.log('[sentry-debug] register called', {
    runtime: process.env.NEXT_RUNTIME,
    nodeEnv: process.env.NODE_ENV,
    hasDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  })

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
      debug: true,
    })
    console.log('[sentry-debug] Sentry.init called for', process.env.NEXT_RUNTIME)
  }
}

export const onRequestError = Sentry.captureRequestError
