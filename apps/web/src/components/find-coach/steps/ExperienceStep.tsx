import { type CoachWizardAnswers, WIZARD_EXPERIENCE } from '@/lib/findCoach'
import { ChoiceListItem, StepHeading } from './shared'

const descriptions: Record<(typeof WIZARD_EXPERIENCE)[number], string> = {
  'Complete beginner': 'You want simplicity, confidence, and a low-friction starting point.',
  'Some experience': 'You have some exposure and want a steadier plan you can stick with.',
  Intermediate: 'You train already and want sharper structure or better progression.',
  Advanced: 'You want someone who can handle higher context, nuance, and detail.',
}

export default function ExperienceStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  return (
    <div>
      <StepHeading
        title="What’s your fitness level?"
        description="This helps us avoid mismatches between the amount of guidance you want and the kind of client a coach usually works best with."
      />

      <div className="space-y-3">
        {WIZARD_EXPERIENCE.map((item) => (
          <ChoiceListItem
            key={item}
            title={item}
            description={descriptions[item]}
            selected={answers.experience_level === item}
            onClick={() => updateAnswers({ experience_level: item })}
          />
        ))}
      </div>
    </div>
  )
}
