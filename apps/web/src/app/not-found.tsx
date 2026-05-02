import Link from 'next/link'
import MarketingNav from '@/components/marketing/MarketingNav'
import PublicFooter from '@/components/marketing/PublicFooter'

export default function NotFound() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main className="mx-auto flex min-h-[68vh] max-w-[1320px] items-center px-8 py-20">
        <section className="max-w-[620px]">
          <div className="eyebrow eyebrow-dot mb-4 inline-flex">404</div>
          <h1 className="h2">This page is off plan.</h1>
          <p
            className="mt-4 max-w-[520px]"
            style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.7 }}
          >
            The link may have moved, expired, or never existed. Head back to
            the dashboard or pricing to pick up from a known place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-accent">
              Go to dashboard
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              View pricing
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
