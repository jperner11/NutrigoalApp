import PublicPageShell from '@/components/marketing/PublicPageShell'
import { COMPANY_NAME, LAST_POLICY_UPDATE, LEGAL_JURISDICTION, SUPPORT_EMAIL } from '@/lib/site'

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Terms of Service"
      title="The rules for using treno during beta"
      intro={`These terms govern access to ${COMPANY_NAME}'s private beta platform. They are written to set clear expectations between the business, Personal Trainers, and clients while keeping the language readable.`}
    >
      <section className="panel-strong p-8">
        <p className="text-sm text-[var(--muted)]">Last updated: {LAST_POLICY_UPDATE}</p>
        <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--muted)]">
          <p>By using treno, you agree to use the service lawfully, keep your account secure, and provide accurate information where it materially affects coaching, plans, or safety.</p>
          <p>Personal Trainers are responsible for how they use the platform with their clients, including assigned plans, communications, and coaching decisions.</p>
          <p>Clients are responsible for following their own judgement, consulting appropriate professionals when needed, and using the app in a way that is honest and safe.</p>
          <p>The product is provided as a private beta and may change, improve, or contain defects while testing is ongoing.</p>
          <p>We may suspend or remove access for misuse, abuse, fraud, unauthorised data access, or behaviour that creates risk for other users or the service.</p>
          <p>Where paid plans apply, billing, cancellation, and subscription management are handled through the payment systems and account settings made available in the product.</p>
          <p>These terms are governed by the laws of {LEGAL_JURISDICTION}. Questions can be sent to <a className="font-semibold text-[var(--brand-700)]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}

