import Link from 'next/link'
import type { ReactNode } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import PublicFooter from '@/components/marketing/PublicFooter'

export default function FindCoachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf6fc_0%,#f7fbfe_42%,#f3f8fc_100%)]">
      <header className="border-b border-[var(--line)] bg-[rgba(251,253,255,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary rounded-full px-5 py-3 text-sm font-semibold">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
      <PublicFooter />
    </div>
  )
}
