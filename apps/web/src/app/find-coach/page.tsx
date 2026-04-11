import type { Metadata } from 'next'
import CoachWizard from '@/components/find-coach/CoachWizard'

export const metadata: Metadata = {
  title: 'Find Your Coach | Meal & Motion',
  description: 'Answer a few questions and get matched with coaches who fit your goals, preferences, and budget.',
}

export default function FindCoachPage() {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <CoachWizard />
      </div>
    </section>
  )
}
