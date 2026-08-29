'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="rounded-full p-2 text-white/70 transition hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex" style={{ color: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.18)' }}>
            {landingCopy.nav.signIn}
          </Link>
          <Link href="/signup" className="btn btn-accent">
            {landingCopy.nav.startFree} →
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="marketing-mobile-menu"
          className="border-t border-[var(--line)] px-8 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1 text-sm">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className="rounded-xl px-3 py-2.5 transition hover:text-white"
                  style={{
                    color: active ? 'var(--brand-400)' : 'rgba(255,255,255,0.72)',
                    background: active ? 'rgba(205,242,78,0.14)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {l.label}
                </Link>
              )
            })}
            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 transition hover:text-white sm:hidden"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              {landingCopy.nav.signIn}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
