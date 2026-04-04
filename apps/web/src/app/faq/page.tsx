import PublicPageShell from '@/components/marketing/PublicPageShell'

const faqs = [
  {
    q: 'Who is mealandmotion for?',
    a: 'The beta is designed primarily for Personal Trainers who want to manage clients through diet plans, training plans, messaging, and accountability workflows. Clients then use the app to follow the programme and log progress.',
  },
  {
    q: 'Should Personal Trainers use web or mobile?',
    a: 'For beta, the strongest trainer workflow is on web. Mobile supports the same ecosystem, but web is the primary operating surface for invites, roster management, and day-to-day oversight.',
  },
  {
    q: 'How does client onboarding work?',
    a: 'A Personal Trainer invites a client by email. The client explicitly accepts the connection before becoming active in the trainer roster. Once accepted, the client sees a trainer-connected experience and waits for assigned plans if none are live yet.',
  },
  {
    q: 'Can managed clients create their own plans?',
    a: 'The intended coaching model is trainer-led. Managed clients follow assigned plans, log adherence, message their trainer, and complete feedback requests rather than self-generating separate programmes.',
  },
  {
    q: 'Is AI required to use the product?',
    a: 'No. AI enhances planning and coaching workflows, but the core beta value is the trainer-client operating system: invite, assign, follow, review, and improve.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. The platform supports training and nutrition workflows but does not replace medical advice, diagnosis, or treatment.',
  },
]

export default function FAQPage() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Answers for trainers, clients, and beta testers"
      intro="This page covers the most important product, workflow, and trust questions we expect during the private beta."
    >
      <div className="space-y-5">
        {faqs.map((item) => (
          <section key={item.q} className="panel-strong p-8">
            <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">{item.q}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.a}</p>
          </section>
        ))}
      </div>
    </PublicPageShell>
  )
}

