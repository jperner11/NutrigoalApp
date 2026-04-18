import Link from 'next/link'
import PublicPageShell from '@/components/marketing/PublicPageShell'
import { faqCopy } from '@/lib/copy/faq'

export default function FAQPage() {
  return (
    <PublicPageShell
      eyebrow={faqCopy.shell.eyebrow}
      title={faqCopy.shell.title}
      intro={faqCopy.shell.intro}
    >
      <section className="panel-strong p-8 sm:p-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {faqCopy.quickCards.map((card) => (
            <div key={card.label} className="surface-card p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{card.label}</div>
              <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-8">
        {faqCopy.sections.map((section) => (
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
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{faqCopy.stillUnsure.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          {faqCopy.stillUnsure.body}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/support" className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
            {faqCopy.stillUnsure.primaryCta}
          </Link>
          <Link href="/signup" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
            {faqCopy.stillUnsure.secondaryCta}
          </Link>
        </div>
      </section>
    </PublicPageShell>
  )
}
