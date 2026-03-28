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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
      {DAY_LABELS.map((label, i) => {
        const isActive = selectedDay === i
        const summary = daySummaries?.[i]

        return (
          <button
            key={i}
            onClick={() => onSelectDay(i)}
            className={`flex-1 min-w-[4rem] px-2 py-2.5 rounded-lg text-center transition-all ${
              isActive
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className={`block text-sm font-semibold ${isActive ? 'text-purple-700' : ''}`}>
              {label}
            </span>
            {summary && summary.mealCount > 0 && (
              <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-purple-500' : 'text-gray-400'}`}>
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
