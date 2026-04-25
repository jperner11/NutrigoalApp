import type { ReactNode } from 'react'

interface AINudgeCardProps {
  kicker?: string
  lead?: string
  body?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}

export default function AINudgeCard({
  kicker,
  lead,
  body,
  actions,
  icon = '✦',
  className = '',
}: AINudgeCardProps) {
  return (
    <div
      className={`card ${className}`.trim()}
      style={{
        padding: 18,
        background: 'var(--acc-soft)',
        borderColor: 'var(--acc)',
      }}
    >
      {kicker ? (
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--acc)',
            letterSpacing: '0.14em',
          }}
        >
          {icon ? <span style={{ marginRight: 6 }}>{icon}</span> : null}
          {kicker.toUpperCase()}
        </div>
      ) : null}

      {(lead || body) && (
        <div
          className="mt-2"
          style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}
        >
          {lead ? (
            <span style={{ color: 'var(--fg-2)' }}>{lead} </span>
          ) : null}
          {body}
        </div>
      )}

      {actions ? <div className="row mt-3.5 gap-1.5">{actions}</div> : null}
    </div>
  )
}
