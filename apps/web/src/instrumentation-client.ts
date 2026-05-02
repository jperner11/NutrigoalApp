import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
  integrations: [
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
    Sentry.feedbackIntegration({
      colorScheme: 'dark',
      buttonLabel: 'Report a bug',
      submitButtonLabel: 'Send',
      formTitle: 'Report a bug',
      messagePlaceholder: 'What happened? What were you trying to do?',
      showBranding: false,
      autoInject: true,
    }),
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
