import type { ReactNode } from 'react'

export function StepHeading({
  title,
  description,
  hint,
}: {
  title: string
  description: string
  hint?: string
}) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-3xl font-bold text-[var(--foreground)] sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">{description}</p>
      {hint ? <p className="mt-2 text-sm font-medium text-[var(--muted-soft)]">{hint}</p> : null}
    </div>
  )
}

export function ChoiceCard({
  title,
  description,
  selected,
  onClick,
  icon,
}: {
  title: string
  description?: string
  selected: boolean
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-5 text-left transition ${
        selected
          ? 'border-[rgba(230,57,70,0.34)] bg-[var(--brand-100)] shadow-[0_14px_32px_rgba(230,57,70,0.16)]'
          : 'border-[var(--line)] bg-[var(--surface-strong)] hover:border-[rgba(230,57,70,0.28)] hover:bg-[rgba(230,57,70,0.08)]'
      }`}
    >
      {icon ? <div className={`mb-4 inline-flex rounded-2xl p-3 ${selected ? 'bg-[var(--brand-500)] text-white' : 'bg-[var(--brand-100)] text-[var(--brand-400)]'}`}>{icon}</div> : null}
      <div className="text-lg font-semibold text-[var(--foreground)]">{title}</div>
      {description ? <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</div> : null}
    </button>
  )
}

export function ChoiceListItem({
  title,
  description,
  selected,
  onClick,
}: {
  title: string
  description?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-4 rounded-[22px] border px-5 py-4 text-left transition ${
        selected
          ? 'border-[rgba(230,57,70,0.34)] bg-[var(--brand-100)]'
          : 'border-[var(--line)] bg-[var(--surface-strong)] hover:border-[rgba(230,57,70,0.28)]'
      }`}
    >
      <div>
        <div className="text-base font-semibold text-[var(--foreground)]">{title}</div>
        {description ? <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</div> : null}
      </div>
      <div
        className={`mt-1 h-5 w-5 shrink-0 rounded-full border transition ${
          selected ? 'border-[var(--brand-500)] bg-[var(--brand-500)] shadow-[inset_0_0_0_4px_var(--background)]' : 'border-[var(--line-strong)] bg-[var(--background-elevated)]'
        }`}
      />
    </button>
  )
}

export function ChoiceChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        selected
          ? 'border-[rgba(230,57,70,0.34)] bg-[var(--brand-100)] text-[var(--brand-400)]'
          : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)] hover:border-[rgba(230,57,70,0.28)]'
      }`}
    >
      {label}
    </button>
  )
}

export function toggleMultiValue(
  values: string[],
  nextValue: string,
  options?: {
    exclusiveValue?: string
    maxSelections?: number
  }
) {
  const exclusiveValue = options?.exclusiveValue
  const maxSelections = options?.maxSelections

  if (values.includes(nextValue)) {
    return values.filter((value) => value !== nextValue)
  }

  if (exclusiveValue && nextValue === exclusiveValue) {
    return [nextValue]
  }

  const withoutExclusive = exclusiveValue ? values.filter((value) => value !== exclusiveValue) : values
  const next = [...withoutExclusive, nextValue]

  if (maxSelections && next.length > maxSelections) {
    return next.slice(next.length - maxSelections)
  }

  return next
}
