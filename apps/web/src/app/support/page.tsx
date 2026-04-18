import Link from 'next/link'
import PublicPageShell from '@/components/marketing/PublicPageShell'
import { supportCopy } from '@/lib/copy/support'

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow={supportCopy.shell.eyebrow}
      title={supportCopy.shell.title}
      intro={supportCopy.shell.intro}
    >
      <section className="panel-strong p-8 sm:p-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {supportCopy.routes.map((route) => (
            <div key={route.label} className="surface-card p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{route.label}</div>
              <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{route.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{supportCopy.contact.title}</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          {supportCopy.contact.bodyBefore}
          <a className="font-semibold text-[var(--brand-700)]" href={`mailto:${supportCopy.contact.email}`}>{supportCopy.contact.email}</a>
          {supportCopy.contact.bodyAfter}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${supportCopy.contact.email}?subject=${encodeURIComponent(supportCopy.contact.mailtoSubject)}`} className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
            {supportCopy.contact.primaryCta}
          </a>
          <Link href="/faq" className="btn-secondary rounded-2xl px-5 py-3 text-sm font-semibold">
            {supportCopy.contact.secondaryCta}
          </Link>
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{supportCopy.include.title}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {supportCopy.include.items.map((item) => (
            <div key={item} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="panel-strong p-8 sm:p-10">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">{supportCopy.helpWith.title}</h2>
        <div className="mt-6 space-y-4">
          {supportCopy.helpWith.items.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
