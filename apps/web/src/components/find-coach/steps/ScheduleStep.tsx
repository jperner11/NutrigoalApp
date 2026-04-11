import { type CoachWizardAnswers, WIZARD_DAYS, WIZARD_TIMES } from '@/lib/findCoach'
import { ChoiceChip, StepHeading, toggleMultiValue } from './shared'

export default function ScheduleStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  return (
    <div>
      <StepHeading
        title="When can you train?"
        description="Availability matters because some coaches are strongest when they can match your preferred rhythm and time windows."
      />

      <div>
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Days</div>
        <div className="flex flex-wrap gap-3">
          {WIZARD_DAYS.map((day) => (
            <ChoiceChip
              key={day}
              label={day}
              selected={answers.preferred_days.includes(day)}
              onClick={() =>
                updateAnswers({
                  preferred_days: toggleMultiValue(answers.preferred_days, day),
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Times of day</div>
        <div className="flex flex-wrap gap-3">
          {WIZARD_TIMES.map((time) => (
            <ChoiceChip
              key={time}
              label={time}
              selected={answers.preferred_times.includes(time)}
              onClick={() =>
                updateAnswers({
                  preferred_times: toggleMultiValue(answers.preferred_times, time),
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
