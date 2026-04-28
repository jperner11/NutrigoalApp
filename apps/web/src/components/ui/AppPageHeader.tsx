import type { ReactNode } from 'react'

interface AppPageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  accent?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  chip?: ReactNode
  className?: string
}

export default function AppPageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
  chip,
  className = '',
}: AppPageHeaderProps) {
  return (
    <div className={`app-section-header ${className}`.trim()}>
      <div className="flex-1 min-w-0">
        {eyebrow ? (
          <div className="app-mono-label">
            {typeof eyebrow === 'string' ? eyebrow.toUpperCase() : eyebrow}
          </div>
        ) : null}

        <div className="row mt-1.5 flex-wrap items-baseline gap-3">
          <h1 className="app-section-title">
            {title}
            {accent ? (
              <>
                {' '}
                <span>
                  {accent}
                </span>
              </>
            ) : null}
          </h1>
          {chip ? <div className="self-center">{chip}</div> : null}
        </div>

        {subtitle ? (
          <p
            className="mt-2 max-w-[640px]"
            style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="app-section-aside">{actions}</div>
      ) : null}
    </div>
  )
}
