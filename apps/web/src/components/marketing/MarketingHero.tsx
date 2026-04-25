import Link from 'next/link'
import ClientPreviewCard from './ClientPreviewCard'
import { landingCopy } from '@/lib/copy/landing'

const { hero } = landingCopy

export default function MarketingHero() {
  return (
    <section className="mx-auto max-w-[1320px] px-8 pb-16 pt-20">
      <div className="row mb-12 justify-between">
        <div className="eyebrow eyebrow-dot fade-up">{hero.eyebrow}</div>
        <div
          className="mono fade-up"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          {hero.region}
        </div>
      </div>

      <div className="grid items-end gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="h1 fade-up mb-7">
            {hero.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span
              className="italic-serif block"
              style={{ color: 'var(--acc)' }}
            >
              {hero.titleAccent}
            </span>
          </h1>

          <p
            className="fade-up max-w-[560px]"
            style={{ fontSize: 18, lineHeight: 1.5, color: 'var(--fg-2)' }}
          >
            {hero.subtitle}
          </p>

          <div className="row fade-up mt-8 flex-wrap gap-2">
            <Link href="/signup" className="btn btn-accent">
              {hero.ctas.forSelf}
            </Link>
            <Link href="/for-coaches" className="btn btn-ghost">
              {hero.ctas.forCoach}
            </Link>
          </div>

          <div className="row fade-up mt-6 flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              {hero.ctas.buildPlan} →
            </Link>
            <Link href="/find-coach" className="btn btn-ghost">
              {hero.ctas.browseCoaches}
            </Link>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--fg-3)' }}
            >
              {hero.ctas.trialNote}
            </span>
          </div>
        </div>

        <ClientPreviewCard />
      </div>

      <div
        className="mt-16 grid grid-cols-2 gap-8 border-t pt-8 sm:grid-cols-4"
        style={{ borderColor: 'var(--line)' }}
      >
        {hero.stats.map((stat) => (
          <div key={stat.label}>
            <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div
              className="mono mt-1.5 uppercase"
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                letterSpacing: '0.1em',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
