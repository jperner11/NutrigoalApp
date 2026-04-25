import type { Metadata } from 'next'
import CoachWizard from '@/components/find-coach/CoachWizard'

export const metadata: Metadata = {
  title: 'Match with a coach · Meal & Motion',
  description:
    'Answer a few questions and get matched with coaches who fit your goals, preferences, and budget.',
}

export default async function MatchCoachPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const goalParam = resolvedSearchParams?.goal
  const initialGoal = Array.isArray(goalParam) ? goalParam[0] : goalParam

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <CoachWizard initialGoal={initialGoal ?? null} />
      </div>
    </section>
  )
}
