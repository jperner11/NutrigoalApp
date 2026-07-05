'use client'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

interface DaySummary {
  calories: number
  protein: number
  carbs: number
  fat: number
  mealCount: number
}

interface WeekDayTabsProps {
  selectedDay: number
  onSelectDay: (day: number) => void
  daySummaries?: Record<number, DaySummary>
}

export default function WeekDayTabs({ selectedDay, onSelectDay, daySummaries }: WeekDayTabsProps) {
  return (
    <div className="flex gap-1 rounded-xl p-1 mb-6 overflow-x-auto" style={{ background: 'var(--line)' }}>
      {DAY_LABELS.map((label, i) => {
        const isActive = selectedDay === i
        const summary = daySummaries?.[i]

        return (
          <button
            key={i}
            onClick={() => onSelectDay(i)}
            className="flex-1 min-w-[4rem] px-2 py-2.5 rounded-lg text-center transition-all"
            style={{
              background: isActive ? 'var(--background)' : 'transparent',
              color: isActive ? 'var(--acc)' : 'var(--fg-2)',
              boxShadow: isActive ? '0 1px 3px var(--line-strong)' : undefined,
            }}
          >
            <span className="block text-sm font-semibold">
              {label}
            </span>
            {summary && summary.mealCount > 0 && (
              <span
                className="block text-[10px] mt-0.5"
                style={{ color: isActive ? 'var(--acc)' : 'var(--fg-4)' }}
              >
                {Math.round(summary.calories)} cal
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { DAY_LABELS }
export type { DaySummary }
