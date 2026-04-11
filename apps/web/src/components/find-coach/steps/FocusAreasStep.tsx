import { type CoachWizardAnswers, WIZARD_FOCUS_AREAS } from '@/lib/findCoach'
import { ChoiceChip, StepHeading, toggleMultiValue } from './shared'

export default function FocusAreasStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  return (
    <div>
      <StepHeading
        title="Any areas you want to focus on?"
        description="These tell us what the coaching should feel grounded in, whether that is lifting, nutrition structure, cardio, or mobility."
      />

      <div className="flex flex-wrap gap-3">
        {WIZARD_FOCUS_AREAS.map((area) => (
          <ChoiceChip
            key={area}
            label={area}
            selected={answers.focus_areas.includes(area)}
            onClick={() =>
              updateAnswers({
                focus_areas: toggleMultiValue(answers.focus_areas, area, { exclusiveValue: 'No preference' }),
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
