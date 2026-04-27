'use client'

export default function ProBadge() {
  return (
    <span
      className="mono ml-auto inline-flex items-center"
      style={{
        padding: '2px 7px',
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        background: 'var(--ink-3)',
        color: 'var(--acc)',
        border: '1px solid var(--acc)',
      }}
    >
      Pro
    </span>
  )
}
