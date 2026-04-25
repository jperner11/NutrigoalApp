import { landingCopy } from '@/lib/copy/landing'

export default function MarketingTicker() {
  const items = [...landingCopy.ticker, ...landingCopy.ticker]

  return (
    <div
      className="overflow-hidden border-y py-5"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="ticker-track flex gap-14 whitespace-nowrap">
        {items.map((text, i) => (
          <span
            key={i}
            className="mono"
            style={{
              fontSize: 13,
              color: 'var(--fg-3)',
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ color: 'var(--acc)', marginRight: 12 }}>✦</span>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
