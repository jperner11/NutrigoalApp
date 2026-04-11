import { type CoachWizardAnswers, WIZARD_SKILLS } from '@/lib/findCoach'
import { ChoiceChip, StepHeading, toggleMultiValue } from './shared'

export default function SkillsStep({
  answers,
  updateAnswers,
}: {
  answers: CoachWizardAnswers
  updateAnswers: (patch: Partial<CoachWizardAnswers>) => void
}) {
  return (
    <div>
      <StepHeading
        title="What kind of help do you need?"
        description="Choose as many as you like. We’ll prioritize coaches whose services line up with the support you actually want."
      />

      <div className="flex flex-wrap gap-3">
        {WIZARD_SKILLS.map((skill) => (
          <ChoiceChip
            key={skill}
            label={skill}
            selected={answers.skills_needed.includes(skill)}
            onClick={() =>
              updateAnswers({
                skills_needed: toggleMultiValue(answers.skills_needed, skill, { exclusiveValue: 'No preference' }),
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
