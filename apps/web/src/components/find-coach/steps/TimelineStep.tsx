import { type CoachWizardAnswers, WIZARD_TIMELINES } from '@/lib/findCoach'
import { ChoiceListItem, StepHeading } from './shared'

const descriptions: Record<(typeof WIZARD_TIMELINES)[number], string> = {
  '1-4 weeks': 'Short-term support for a sprint, reset, or event block.',
  '1-3 months': 'A clear near-term window with room for structured progress.',
  '3-6 months': 'A more meaningful coaching runway with deeper habit change.',
  'As long as it takes': 'You want a coach for the long game, not a quick fix.',
  'I just need one session': 'You mostly need strategy, review, or a one-off consult.',
}

export default function TimelineStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  return (
    <div>
      <StepHeading
        title="By when?"
        description="Some coaches are better for fast clarity, others for longer-term support. Your timeline helps us rank for that fit."
      />

      <div className="space-y-3">
        {WIZARD_TIMELINES.map((timeline) => (
          <ChoiceListItem
            key={timeline}
            title={timeline}
            description={descriptions[timeline]}
            selected={answers.timeline === timeline}
            onClick={() => updateAnswers({ timeline })}
          />
        ))}
      </div>
    </div>
  )
}
