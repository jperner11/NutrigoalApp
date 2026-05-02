'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from '@/components/brand/BrandLogo'
import { landingCopy } from '@/lib/copy/landing'

const links = [
  { label: landingCopy.nav.home, href: '/' },
  { label: landingCopy.nav.findCoach, href: '/find-coach' },
  { label: landingCopy.nav.forCoaches, href: '/for-coaches' },
  { label: landingCopy.nav.howItWorks, href: '/how-it-works' },
  { label: landingCopy.nav.pricing, href: '/pricing' },
]

export default function MarketingNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(19,16,18,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-8 py-5">
        <BrandLogo href="/" />

        <div className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className="relative py-1 transition hover:text-[var(--fg)]"
                style={{
                  color: active ? 'var(--fg)' : 'var(--fg-3)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {l.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-[1rem] left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost">
            {landingCopy.nav.signIn}
          </Link>
          <Link href="/signup" className="btn btn-accent">
            {landingCopy.nav.startFree} →
          </Link>
        </div>
      </div>
    </nav>
  )
}
