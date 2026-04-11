import { type CoachWizardAnswers } from '@/lib/findCoach'
import { ChoiceChip, StepHeading } from './shared'

const budgetPeriods: Array<NonNullable<CoachWizardAnswers['budget_period']>> = ['one_time', 'weekly', 'monthly']

function formatBudgetLabel(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function BudgetStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  const minValue = answers.budget_min ?? 40
  const maxValue = answers.budget_max ?? 160

  return (
    <div>
      <StepHeading
        title="What’s your budget?"
        description="This gives us a realistic fit filter. It does not lock you in, but it helps us avoid showing coaches who are clearly outside your range."
      />

      <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(237,248,255,0.54)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[22px] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Minimum</div>
            <div className="mt-2 font-display text-3xl font-bold text-[var(--foreground)]">{formatBudgetLabel(minValue)}</div>
          </div>
          <div className="rounded-[22px] bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Maximum</div>
            <div className="mt-2 font-display text-3xl font-bold text-[var(--foreground)]">{formatBudgetLabel(maxValue)}</div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Minimum budget</div>
            <input
              type="range"
              min={20}
              max={280}
              step={10}
              value={minValue}
              onChange={(event) => {
                const nextMin = Number(event.target.value)
                updateAnswers({
                  budget_min: nextMin,
                  budget_max: Math.max(maxValue, nextMin),
                })
              }}
              className="h-2 w-full cursor-pointer accent-[var(--brand-500)]"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Maximum budget</div>
            <input
              type="range"
              min={20}
              max={320}
              step={10}
              value={Math.max(maxValue, minValue)}
              onChange={(event) => {
                const nextMax = Number(event.target.value)
                updateAnswers({
                  budget_min: Math.min(minValue, nextMax),
                  budget_max: nextMax,
                })
              }}
              className="h-2 w-full cursor-pointer accent-[var(--brand-900)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Budget period</div>
        <div className="flex flex-wrap gap-3">
          {budgetPeriods.map((period) => (
            <ChoiceChip
              key={period}
              label={period.replace('_', ' ')}
              selected={answers.budget_period === period}
              onClick={() => updateAnswers({ budget_period: period })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
