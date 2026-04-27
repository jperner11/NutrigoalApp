import Link from 'next/link'
import Portrait from '@/components/ui/Portrait'
import { forCoachesCopy } from '@/lib/copy/forCoaches'

const c = forCoachesCopy

export default function MarketingForCoaches() {
  return (
    <section
      className="px-8 py-24"
      style={{ background: 'var(--surface-strong)', color: 'var(--on-strong)' }}
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div
            className="eyebrow mb-4"
            style={{
              background: 'rgba(245,241,234,0.08)',
              color: 'rgba(245,241,234,0.7)',
              borderColor: 'rgba(245,241,234,0.12)',
            }}
          >
            {c.eyebrow}
          </div>
          <h2 className="h2" style={{ color: 'var(--on-strong)' }}>
            {c.titleMain}
            <br />
            <span
              className="italic-serif"
              style={{ color: 'rgba(245,241,234,0.55)' }}
            >
              {c.titleAccent}
            </span>
          </h2>
          <p
            className="mt-6 max-w-[460px]"
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: 'rgba(245,241,234,0.7)',
            }}
          >
            {c.body}
          </p>

          <div className="col mt-8 gap-2.5">
            {c.bullets.map((b) => (
              <div
                key={b.title}
                className="pb-4"
                style={{ borderBottom: '1px solid rgba(245,241,234,0.1)' }}
              >
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>
                  {b.title}
                </div>
                <div
                  className="mt-1"
                  style={{ fontSize: 14, color: 'rgba(245,241,234,0.6)' }}
                >
                  {b.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="row mt-8 gap-2">
            <Link
              href="/signup?role=coach"
              className="btn"
              style={{
                background: 'var(--foreground)',
                color: 'var(--background)',
              }}
            >
              {c.ctas.open} →
            </Link>
            <Link
              href="/how-it-works"
              className="btn"
              style={{
                color: 'var(--on-strong)',
                border: '1px solid rgba(245,241,234,0.2)',
              }}
            >
              {c.ctas.how}
            </Link>
          </div>
        </div>

        <div
          className="rounded-3xl p-7"
          style={{
            background: 'rgba(245,241,234,0.04)',
            border: '1px solid rgba(245,241,234,0.1)',
          }}
        >
          <div className="row mb-5 justify-between">
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'rgba(245,241,234,0.55)',
              }}
            >
              {c.preview.kicker}
            </div>
            <span
              className="chip"
              style={{
                background: 'rgba(26,163,122,0.15)',
                borderColor: 'rgba(26,163,122,0.4)',
                color: '#7ce5b8',
              }}
            >
              ● {c.preview.liveChip}
            </span>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: '120px 1fr' }}>
            <Portrait seed={1} label={c.preview.coachInitials} height={140} />
            <div>
              <div className="serif" style={{ fontSize: 28 }}>
                {c.preview.coachName}
              </div>
              <div
                className="mono mt-1"
                style={{ fontSize: 11, color: 'rgba(245,241,234,0.55)' }}
              >
                {c.preview.coachLine}
              </div>
              <div className="row mt-2.5 flex-wrap gap-1.5">
                {c.preview.tags.map((t) => (
                  <span
                    key={t}
                    className="chip"
                    style={{
                      background: 'rgba(245,241,234,0.06)',
                      borderColor: 'rgba(245,241,234,0.1)',
                      color: 'rgba(245,241,234,0.75)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className="my-5 h-px w-full"
            style={{ background: 'rgba(245,241,234,0.1)' }}
          />

          <div className="grid grid-cols-3 gap-3">
            {c.preview.stats.map((s) => (
              <div key={s.label}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'rgba(245,241,234,0.45)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {s.label.toUpperCase()}
                </div>
                <div className="serif mt-1" style={{ fontSize: 20 }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-5 rounded-xl p-3.5"
            style={{
              background: 'rgba(245,241,234,0.05)',
              border: '1px solid rgba(245,241,234,0.1)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'rgba(245,241,234,0.6)',
                letterSpacing: '0.12em',
              }}
            >
              {c.preview.lead.kicker}
            </div>
            <div className="mt-1.5" style={{ fontSize: 13 }}>
              {c.preview.lead.message}
            </div>
            <div className="row mt-3 gap-1.5">
              <button
                className="btn btn-accent"
                style={{ padding: '6px 12px', fontSize: 11 }}
              >
                Accept
              </button>
              <button
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  color: 'var(--on-strong)',
                  border: '1px solid rgba(245,241,234,0.2)',
                }}
              >
                Reply
              </button>
              <button
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  color: 'var(--on-strong)',
                  border: '1px solid rgba(245,241,234,0.2)',
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
