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

        <div className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className="rounded-full px-3 py-1.5 transition hover:text-white"
                style={{
                  color: active ? 'var(--brand-400)' : 'rgba(255,255,255,0.52)',
                  background: active ? 'rgba(205,242,78,0.14)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.18)' }}>
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
