import Link from 'next/link'
import PublicPageShell from '@/components/marketing/PublicPageShell'
import { SUPPORT_EMAIL } from '@/lib/site'

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="How support works during the beta"
      intro="Private beta support is intentionally high-touch. If something breaks, feels unclear, or interrupts a trainer-client workflow, the goal is to get you unstuck quickly and turn that feedback into product improvement."
    >
      <section className="panel-strong p-8 sm:p-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Best for</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">Broken flows, invite issues, confusing UX, account questions, and beta feedback.</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Fastest route</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">Use the in-app support form if you can access settings. It gives the team the right context faster.</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Fallback</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted)]">If you are blocked before login, email support directly and include your role and device.</div>
          </div>
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">Contact support</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Send onboarding questions, bug reports, account issues, trainer-client linking problems, and general beta feedback to{' '}
          <a className="font-semibold text-[var(--brand-700)]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=mealandmotion%20beta%20support`} className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
            Email support
          </a>
          <Link href="/faq" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
            Read the FAQ
          </Link>
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">What to include in a support request</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            'Whether you are a Personal Trainer or client',
            'Whether the issue happened on web or mobile',
            'The exact step you were trying to complete',
            'What you expected to happen',
            'What actually happened instead',
            'Any screenshot or screen recording you can share',
          ].map((item) => (
            <div key={item} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">What support can help with</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              title: 'Account access and onboarding',
              body: 'Invite links, sign-in problems, acceptance flow issues, and confusion around trainer-client connection states.',
            },
            {
              title: 'Plans and coaching workflow',
              body: 'Missing plans, trainer assignment issues, client visibility problems, and anything that blocks the coaching loop.',
            },
            {
              title: 'Product bugs and usability',
              body: 'Broken buttons, incorrect data, layout issues, timing bugs, and places where the product feels unclear or unsafe.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">Beta support expectations</h2>
        <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--muted)]">
          <p>Support during beta is personal and practical. The focus is getting people unblocked, clarifying intent, and learning where the product still needs polish.</p>
          <p>You may occasionally be asked for extra context, screenshots, or the exact steps you took so the issue can be reproduced quickly.</p>
          <p>If you are testing with real clients, please report anything that feels trust-breaking or confusing as early as possible. In a coaching product, clarity and confidence matter as much as raw feature count.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
