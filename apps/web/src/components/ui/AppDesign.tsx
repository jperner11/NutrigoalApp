import type { ReactNode } from 'react'

type Tone = 'default' | 'accent' | 'success' | 'warn' | 'danger' | 'muted'

const toneColor: Record<Tone, string> = {
  default: 'var(--foreground)',
  accent: 'var(--acc)',
  success: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--brand-400)',
  muted: 'var(--fg-3)',
}

export function AppWorkspaceShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`app-workspace ${className}`.trim()}>
      {children}
    </div>
  )
}

export function AppHeroPanel({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
  meta,
  children,
  className = '',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  accent?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`app-hero-panel ${className}`.trim()}>
      <div className="app-hero-content">
        {eyebrow ? <div className="app-mono-label">{eyebrow}</div> : null}
        <h1 className="app-hero-title">
          {title}
          {accent ? <> <span>{accent}</span></> : null}
        </h1>
        {subtitle ? <p className="app-hero-subtitle">{subtitle}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
      <div className="app-hero-side">
        {actions ? <div className="app-hero-actions">{actions}</div> : null}
        {meta ? <div className="app-hero-meta">{meta}</div> : <HeartbeatLine />}
      </div>
    </section>
  )
}

export function AppSectionHeader({
  index,
  eyebrow,
  title,
  accent,
  action,
  summary,
  className = '',
}: {
  index?: string | number
  eyebrow?: ReactNode
  title: ReactNode
  accent?: ReactNode
  action?: ReactNode
  summary?: ReactNode
  className?: string
}) {
  return (
    <div className={`app-section-header ${className}`.trim()}>
      <div>
        <div className="app-mono-label">
          {index !== undefined ? <span className="app-section-index">N° {String(index).padStart(2, '0')}</span> : null}
          {eyebrow ? <span>{eyebrow}</span> : null}
        </div>
        <h2 className="app-section-title">
          {title}
          {accent ? <> <span>{accent}</span></> : null}
        </h2>
      </div>
      <div className="app-section-aside">
        {summary ? <div className="app-section-summary">{summary}</div> : null}
        {action}
      </div>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  progress,
  tone = 'default',
  footer,
  className = '',
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  icon?: ReactNode
  progress?: number
  tone?: Tone
  footer?: ReactNode
  className?: string
}) {
  return (
    <article className={`app-metric-card ${tone === 'accent' ? 'is-accent' : ''} ${className}`.trim()}>
      <div className="app-card-topline">
        <span>{label}</span>
        {icon ? <span style={{ color: toneColor[tone] }}>{icon}</span> : null}
      </div>
      <div className="app-metric-value">
        {value}
        {unit ? <span>{unit}</span> : null}
      </div>
      {footer ? <div className="app-card-footer">{footer}</div> : null}
      {progress !== undefined ? (
        <div className="app-progress-track">
          <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      ) : null}
    </article>
  )
}

export function ListCard({
  eyebrow,
  title,
  meta,
  action,
  children,
  tone = 'default',
  className = '',
}: {
  eyebrow?: ReactNode
  title?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <article className={`app-list-card ${tone === 'accent' ? 'is-accent' : ''} ${className}`.trim()}>
      {(eyebrow || title || meta || action) ? (
        <div className="app-list-card-head">
          <div>
            {eyebrow ? <div className="app-mono-label">{eyebrow}</div> : null}
            {title ? <h3>{title}</h3> : null}
            {meta ? <p>{meta}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </article>
  )
}

export function EmptyStateCard({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="app-empty-card">
      {icon ? <div className="app-empty-icon">{icon}</div> : null}
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function StatusPill({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <span className="app-status-pill" style={{ color: toneColor[tone] }}>
      {children}
    </span>
  )
}

export function HeartbeatLine() {
  return (
    <svg className="app-heartline" viewBox="0 0 420 96" fill="none" aria-hidden="true">
      <path
        d="M0 52H70L82 52L94 24L120 86L148 34L170 52H224L246 20L270 76L294 42L318 52H420"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
