interface WizardProgressProps {
  currentStep: number
  totalSteps: number
}

export default function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = Math.max((currentStep / totalSteps) * 100, 4)

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">
            Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
        <div className="text-sm font-semibold text-[var(--brand-400)]">
          {Math.round((currentStep / totalSteps) * 100)}%
        </div>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-[var(--brand-100)]">
        <div
          className="h-2.5 rounded-full bg-[linear-gradient(90deg,#e63946,#f05661)] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
