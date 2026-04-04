import PublicPageShell from '@/components/marketing/PublicPageShell'
import { COMPANY_NAME } from '@/lib/site'

export default function HealthDisclaimerPage() {
  return (
    <PublicPageShell
      eyebrow="Health Disclaimer"
      title="Important information about coaching, health, and AI"
      intro={`${COMPANY_NAME} supports nutrition, training, and coaching workflows. It does not replace medical care, diagnosis, or treatment.`}
    >
      <section className="panel-strong p-8 space-y-5 text-sm leading-7 text-[var(--muted)]">
        <p>The platform provides planning tools, tracking, coach-client communication, and AI-assisted recommendations for health, fitness, and nutrition workflows.</p>
        <p>Nothing in the app should be treated as medical advice, diagnosis, or emergency guidance. Always consult an appropriate qualified professional for medical concerns, injuries, conditions, allergies, eating disorders, or significant changes to health.</p>
        <p>Personal Trainers using the product remain responsible for their own professional judgement, qualifications, client safety decisions, and plan review.</p>
        <p>AI-generated outputs may be helpful but can still be incomplete, mistaken, or unsuitable for a specific person. Trainers and users should review important outputs before acting on them.</p>
        <p>If you feel unwell, injured, unsafe, or uncertain, stop and seek appropriate professional advice.</p>
      </section>
    </PublicPageShell>
  )
}

