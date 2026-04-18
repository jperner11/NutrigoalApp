import Link from 'next/link'
import BrandLogo from '@/components/brand/BrandLogo'
import { COMPANY_NAME, SUPPORT_EMAIL } from '@/lib/site'
import { footerCopy } from '@/lib/copy/footer'

export default function PublicFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-white/75">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <BrandLogo href="/" />
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {footerCopy.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{footerCopy.companyHeading}</div>
              <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                {footerCopy.links.map((link) => (
                  <div key={link.href}>
                    <Link href={link.href} className="transition hover:text-[var(--foreground)]">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{footerCopy.supportHeading}</div>
              <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                <p>{COMPANY_NAME}</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-[var(--foreground)]">
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
          © 2026 {COMPANY_NAME}. {footerCopy.rights}
        </div>
      </div>
    </footer>
  )
}
