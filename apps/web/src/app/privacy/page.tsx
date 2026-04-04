import PublicPageShell from '@/components/marketing/PublicPageShell'
import { COMPANY_NAME, LAST_POLICY_UPDATE, SUPPORT_EMAIL } from '@/lib/site'

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy Policy"
      title="How we collect, use, and protect personal data"
      intro={`${COMPANY_NAME} processes personal data to operate a coach-led nutrition and training platform. This draft is designed to be clear, practical, and suitable for a private beta while remaining easy to refine with formal legal review.`}
    >
      <section className="panel-strong p-8">
        <p className="text-sm text-[var(--muted)]">Last updated: {LAST_POLICY_UPDATE}</p>
        <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--muted)]">
          <p>We collect account details such as name, email, login credentials, and role selection when you create an account.</p>
          <p>We also process health, nutrition, and fitness-related information you choose to provide, including measurements, goals, injuries, dietary preferences, meal logs, workout logs, hydration, cardio, progress photos, messages, and coach feedback.</p>
          <p>We use this data to provide the app, personalise plans, support coach-client relationships, generate AI-assisted features, improve product performance, detect misuse, and communicate important service updates.</p>
          <p>If you join a Personal Trainer through an invite, that trainer can view and manage the information needed to coach you inside the product, including assigned plans, compliance data, progress entries, messages, and check-ins.</p>
          <p>We do not sell personal data. We may rely on service providers for hosting, authentication, analytics, payments, and AI infrastructure where necessary to operate the service securely.</p>
          <p>You may request account deletion and deletion of associated personal data through the app settings or by contacting <a className="font-semibold text-[var(--brand-700)]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          <p>Private beta access is limited and support may be more direct and manual than in a final production launch.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}

