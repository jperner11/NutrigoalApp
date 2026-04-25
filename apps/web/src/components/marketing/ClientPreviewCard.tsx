import { landingCopy } from '@/lib/copy/landing'

const { clientPreview } = landingCopy

export default function ClientPreviewCard() {
  return (
    <div className="card fade-up p-6">
      <div className="row mb-5 justify-between">
        <div>
          <div
            className="mono"
            style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.16em' }}
          >
            {clientPreview.kicker}
          </div>
          <div className="h3 mt-1">{clientPreview.title}</div>
        </div>
        <span className="chip" style={{ color: 'var(--ok)' }}>
          <span
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--acc)' }}
          />
          {clientPreview.statusChip}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {clientPreview.metrics.map((m) => (
          <div key={m.label} className="card-2 p-3.5">
            <div
              className="mono"
              style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
            >
              {m.label.toUpperCase()}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>
                {m.value}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{m.unit}</span>
            </div>
            <div
              className="mt-2.5"
              style={{
                height: 3,
                background: 'var(--line)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${m.progress * 100}%`,
                  height: '100%',
                  background: 'var(--acc)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card-2 p-4">
        <div className="row mb-3 justify-between">
          <div
            className="mono"
            style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em' }}
          >
            {clientPreview.nextMeal.kicker}
          </div>
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>
            {clientPreview.nextMeal.kcal}
          </span>
        </div>
        <div style={{ fontSize: 15, marginBottom: 4 }}>{clientPreview.nextMeal.name}</div>
        <div className="row gap-8 mt-2.5">
          {clientPreview.nextMeal.macros.map((macro) => (
            <span key={macro} className="chip">
              {macro}
            </span>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex gap-2.5 rounded-xl p-3"
        style={{
          background: 'var(--acc-soft)',
          border: '1px solid var(--acc)',
        }}
      >
        <div style={{ color: 'var(--acc)', fontSize: 14 }}>✦</div>
        <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
          {clientPreview.nudge.lead}{' '}
          <span style={{ color: 'var(--fg)' }}>{clientPreview.nudge.action}</span>
        </div>
      </div>
    </div>
  )
}
