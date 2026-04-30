import type { Metadata } from 'next'
import CoachDirectory from '@/components/marketing/CoachDirectory'

export const metadata: Metadata = {
  title: 'Find a coach · Treno',
  description:
    'Browse Personal Trainers by goal, format, and budget. Or take the 60-second match quiz.',
}

export default function FindCoachPage() {
  return <CoachDirectory />
}
