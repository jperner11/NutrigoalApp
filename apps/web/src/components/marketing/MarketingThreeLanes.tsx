import Link from 'next/link'
import { landingCopy } from '@/lib/copy/landing'

const { threeLanes } = landingCopy

export default function MarketingThreeLanes() {
  return (
    <section className="mx-auto max-w-[1320px] px-8 py-24">
      <div className="mb-12 grid gap-14 lg:grid-cols-[1fr_2fr]">
        <div className="eyebrow eyebrow-dot self-start">{threeLanes.eyebrow}</div>
        <h2 className="h2">
          {threeLanes.titleMain}
          <br />
          <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
            {threeLanes.titleAccent}
          </span>
        </h2>
      </div>

      <div className="col gap-12">
        {threeLanes.lanes.map((lane, i) => (
          <div
            key={lane.tag}
            className="rounded-[20px] p-7"
            style={{
              border: '1px solid var(--line-2)',
              background: i === 0 ? 'var(--ink-2)' : 'transparent',
            }}
          >
            <div
              className="grid items-center gap-8"
              style={{ gridTemplateColumns: '160px 1.2fr 1fr auto' }}
            >
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.18em' }}
              >
                {lane.tag}
              </div>
              <div className="serif" style={{ fontSize: 32 }}>
                {lane.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>{lane.sub}</div>
              <Link href={lane.href} className="btn btn-ghost whitespace-nowrap">
                {lane.cta} →
              </Link>
            </div>

            <div
              className="mt-6 grid gap-12 border-t pt-6 lg:grid-cols-[1.4fr_1fr]"
              style={{ borderColor: 'var(--line)' }}
            >
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)' }}>
                {lane.body}
              </p>
              <div className="col gap-2.5">
                {lane.bullets.map((b) => (
                  <div
                    key={b}
                    className="row gap-2.5"
                    style={{ fontSize: 14 }}
                  >
                    <span style={{ color: 'var(--acc)' }}>✓</span> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
