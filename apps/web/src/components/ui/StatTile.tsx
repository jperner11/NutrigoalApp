import type { ReactNode } from 'react'

type Tone = 'acc' | 'ok' | 'warn' | 'muted'

interface StatTileProps {
  label: string
  value: ReactNode
  unit?: string
  progress?: number
  change?: ReactNode
  changeTone?: Tone
  variant?: 'card' | 'card-2'
  size?: 'sm' | 'md'
  icon?: ReactNode
  iconTone?: Tone
  hero?: boolean
  className?: string
}

const TONES: Record<Tone, string> = {
  acc: 'var(--acc)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  muted: 'var(--fg-3)',
}

export default function StatTile({
  label,
  value,
  unit,
  progress,
  change,
  changeTone = 'acc',
  variant = 'card-2',
  size = 'md',
  icon,
  iconTone = 'muted',
  hero = false,
  className = '',
}: StatTileProps) {
  const padding = size === 'sm' ? 12 : 16
  const valueSize = size === 'sm' ? 22 : 28
  const labelSize = size === 'sm' ? 9 : 10

  // Hero treatment: subtle accent tint to lift one tile above the others
  const heroStyles: React.CSSProperties = hero
    ? {
        background: 'var(--acc-soft)',
        borderColor: 'var(--acc)',
      }
    : {}

  return (
    <div
      className={`${variant} ${className}`.trim()}
      style={{ padding, ...heroStyles }}
    >
      <div className="row items-center gap-1.5">
        {icon ? (
          <span
            className="inline-flex"
            style={{ color: TONES[iconTone], lineHeight: 0 }}
          >
            {icon}
          </span>
        ) : null}
        <div
          className="mono"
          style={{
            fontSize: labelSize,
            color: 'var(--fg-4)',
            letterSpacing: '0.12em',
          }}
        >
          {label.toUpperCase()}
        </div>
      </div>

      <div className="row mt-1.5 items-baseline" style={{ gap: 4 }}>
        <span className="serif" style={{ fontSize: valueSize, lineHeight: 1 }}>
          {value}
        </span>
        {unit ? (
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{unit}</span>
        ) : null}
      </div>

      {change ? (
        <div
          className="mono mt-1"
          style={{
            fontSize: 10,
            color: TONES[changeTone],
            letterSpacing: '0.04em',
          }}
        >
          {change}
        </div>
      ) : null}

      {progress !== undefined ? (
        <div
          className="mt-2.5 overflow-hidden rounded-full"
          style={{ height: 3, background: 'var(--line)' }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              height: '100%',
              background: 'var(--acc)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
