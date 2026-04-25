import type { ReactNode } from 'react'
import AINudgeCard from './AINudgeCard'

interface CoachMessageCardProps {
  coachName: string
  message: ReactNode
  actions?: ReactNode
  className?: string
}

export default function CoachMessageCard({
  coachName,
  message,
  actions,
  className,
}: CoachMessageCardProps) {
  return (
    <AINudgeCard
      kicker={`From ${coachName}`}
      body={message}
      actions={actions}
      className={className}
    />
  )
}
