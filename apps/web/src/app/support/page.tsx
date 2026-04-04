import PublicPageShell from '@/components/marketing/PublicPageShell'
import { SUPPORT_EMAIL } from '@/lib/site'

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="How to get help during the beta"
      intro="Private beta support is intentionally high-touch. If something breaks, feels unclear, or blocks a trainer-client workflow, we want to hear about it quickly."
    >
      <section className="panel-strong p-8">
        <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Contact</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Send support requests, onboarding questions, bug reports, and beta feedback to{' '}
          <a className="font-semibold text-[var(--brand-700)]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </PublicPageShell>
  )
}
