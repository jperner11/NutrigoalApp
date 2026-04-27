import type { ReactNode } from 'react'

interface WizardShellProps {
  stepLabel: string
  title: string
  description: string
  aside: ReactNode
  progress: ReactNode
  children: ReactNode
  footer: ReactNode
}

export default function WizardShell({
  stepLabel,
  title,
  description,
  aside,
  progress,
  children,
  footer,
}: WizardShellProps) {
  return (
    <div className="overflow-hidden rounded-[36px] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
      <div className="grid min-h-[760px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#221d1f_0%,#5a0f15_58%,#e63946_140%)] p-8 text-white sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,241,234,0.12),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(230,57,70,0.24),transparent_22%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/90">
                {stepLabel}
              </div>
              <h1 className="mt-6 max-w-md font-display text-4xl font-bold leading-[0.98] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-sky-50/82 sm:text-lg">
                {description}
              </p>
            </div>

            <div className="relative rounded-[30px] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
              {aside}
            </div>
          </div>
        </aside>

        <div className="flex min-h-full flex-col bg-[var(--background-elevated)]">
          <div className="border-b border-[var(--line)] px-6 py-5 sm:px-8">
            {progress}
          </div>

          <div className="flex-1 px-6 py-8 sm:px-8 sm:py-10">
            {children}
          </div>

          <div className="border-t border-[var(--line)] bg-[var(--surface-strong)] px-6 py-5 sm:px-8">
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}
