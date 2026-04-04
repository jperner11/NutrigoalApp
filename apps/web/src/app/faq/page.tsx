import Link from 'next/link'
import PublicPageShell from '@/components/marketing/PublicPageShell'
import { SUPPORT_EMAIL } from '@/lib/site'

const faqSections = [
  {
    title: 'Product and positioning',
    items: [
      {
        q: 'Who is mealandmotion for?',
        a: 'mealandmotion is built for Personal Trainers who want one system for client onboarding, plan delivery, messaging, accountability, and day-to-day oversight. Clients then use the app to follow assigned plans, log meals and training, respond to feedback, and stay connected to their trainer.',
      },
      {
        q: 'Is this a consumer fitness app or a coaching platform?',
        a: 'The beta is intentionally coaching-led. Individual users can still use the product directly, but the strongest differentiation is the Personal Trainer workflow: invite a client, get explicit acceptance, assign plans, track adherence, and manage the relationship over time.',
      },
      {
        q: 'What makes this different from other coaching tools?',
        a: 'The goal is to keep training, nutrition, adherence, and communication together in a calmer, more connected system. Instead of bolting coaching onto a generic tracker, the product is moving toward a real coach-client operating system where onboarding, plan delivery, progress visibility, and feedback all sit in one place.',
      },
    ],
  },
  {
    title: 'Trainer workflow',
    items: [
      {
        q: 'Should Personal Trainers use web or mobile?',
        a: 'For beta, Personal Trainers should treat web as the primary operating surface. That is where roster management, client invites, oversight, reports, and deeper account administration are strongest today. Mobile is useful, but web is the recommended default for serious testing.',
      },
      {
        q: 'How does inviting a client work?',
        a: 'A Personal Trainer sends an invite by email from the clients area. The invite appears as pending until the client accepts. If the person already has an account, they must still explicitly approve the relationship before anything is linked. That acceptance step is deliberate and is part of the trust model for beta.',
      },
      {
        q: 'What happens after a client accepts?',
        a: 'The client becomes active in the trainer roster. From there, the trainer can assign diet and training plans, message the client, request feedback, and review adherence. The client will see a trainer-connected experience and a clear waiting state if plans have not been assigned yet.',
      },
      {
        q: 'Can one client have multiple trainers in beta?',
        a: 'No. The current beta assumes one active trainer per client. If someone is already assigned to another trainer, the system should prevent them from accepting a second active relationship without resolving the first one.',
      },
    ],
  },
  {
    title: 'Client experience',
    items: [
      {
        q: 'Can managed clients create their own plans?',
        a: 'No, not in the intended beta flow. Managed clients are meant to follow trainer-assigned plans, log progress, message their trainer, and respond to feedback. That keeps the coaching model clean and prevents clients from bypassing the trainer relationship with a separate self-serve programme.',
      },
      {
        q: 'What should clients use day to day?',
        a: 'Clients are mobile-first in the beta. The app is intended for viewing assigned plans, logging meals and workouts, tracking progress, handling adherence tasks, and messaging the trainer. Web can support them, but mobile is the primary daily experience.',
      },
      {
        q: 'What if a client has accepted the invite but no plan is assigned yet?',
        a: 'They should see a clear connected state explaining that the relationship is active and that the trainer still needs to assign the programme. That prevents confusion and sets the right expectation during onboarding.',
      },
    ],
  },
  {
    title: 'AI, safety, and trust',
    items: [
      {
        q: 'Is AI required to use the platform?',
        a: 'No. AI can support plan creation, suggestions, and coaching language, but the core value of the beta does not depend on AI. The essential workflow is still trainer-client onboarding, plan assignment, adherence, feedback, and communication.',
      },
      {
        q: 'Is this medical advice or a medical device?',
        a: 'No. mealandmotion supports training, nutrition, and accountability workflows. It is not a medical device and does not provide diagnosis, treatment, or emergency care. Users should seek qualified medical advice where appropriate, especially for injuries, medical conditions, eating disorders, pregnancy, or anything requiring clinical supervision.',
      },
      {
        q: 'How is personal data handled in beta?',
        a: 'The product processes account, coaching, and progress data to operate the service. Trainer-managed clients share relevant in-app information with their trainer as part of the relationship. You can read more on the Privacy Policy and Terms pages, and you can contact support if you need help with deletion or account questions.',
      },
    ],
  },
  {
    title: 'Support and beta expectations',
    items: [
      {
        q: 'How do I get help during the beta?',
        a: `Use the in-app support form if you are signed in, or email ${SUPPORT_EMAIL} if you are blocked before login. Include your role, platform, what you expected, what actually happened, and screenshots if possible.`,
      },
      {
        q: 'Is everything fully polished yet?',
        a: 'No. This is a private beta. The product is functional and increasingly robust, but we are still refining edge cases, role experiences, and coach-client workflows. Feedback is expected and welcomed, especially where something feels unclear or trust-breaking.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Answers for trainers, clients, and early beta testers"
      intro="This page is designed to answer the practical questions people ask before trusting a new coaching platform: who it is for, how the trainer-client flow works, what the current beta supports, and where to get help."
    >
      <section className="panel-strong p-8 sm:p-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Trainer beta</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">Best experience on web for roster management, invites, reporting, and day-to-day oversight.</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Client beta</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">Best experience on mobile for following plans, logging progress, and staying connected to the trainer.</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Need help?</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">If something blocks onboarding or trust, go straight to support so we can fix it quickly.</div>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {faqSections.map((section) => (
          <section key={section.title} className="panel-strong p-8 sm:p-10">
            <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{section.title}</h2>
            <div className="mt-6 space-y-5">
              {section.items.map((item) => (
                <div key={item.q} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-6">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{item.q}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">Still unsure?</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          If you are deciding whether the beta fits your workflow, the best next step is to review support expectations or create an account and test the invite flow with one trainer and one client.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/support" className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
            Visit support
          </Link>
          <Link href="/signup" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
            Create account
          </Link>
        </div>
      </section>
    </PublicPageShell>
  )
}
