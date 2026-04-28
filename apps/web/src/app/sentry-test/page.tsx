'use client'

export default function SentryTestPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Sentry test</h1>
      <p>Click each button. Both errors should appear in the Sentry dashboard.</p>
      <button
        onClick={() => {
          throw new Error('Sentry client test error')
        }}
        style={{ padding: '8px 16px', marginRight: 8 }}
      >
        Throw client error
      </button>
      <button
        onClick={async () => {
          await fetch('/sentry-test/api')
        }}
        style={{ padding: '8px 16px' }}
      >
        Trigger server error
      </button>
    </div>
  )
}
