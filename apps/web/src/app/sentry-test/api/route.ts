import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    throw new Error('Sentry server test error')
  } catch (err) {
    Sentry.captureException(err)
    await Sentry.flush(2000)
    return new Response('captured', { status: 500 })
  }
}
