import Link from 'next/link'
import type { ReactNode } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import PublicFooter from '@/components/marketing/PublicFooter'

interface PublicPageShellProps {
  eyebrow: string
  title: string
  intro: string
  children: ReactNode
}

export default function PublicPageShell({ eyebrow, title, intro, children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-[rgba(19,16,18,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3">
            <Link href="/faq" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              FAQ
            </Link>
            <Link href="/support" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              Support
            </Link>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="panel-strong p-8 sm:p-10">
            <div className="eyebrow mb-5">{eyebrow}</div>
            <h1 className="font-display text-4xl font-bold text-[var(--foreground)] sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">{intro}</p>
          </div>

          <div className="mt-8 space-y-8 text-[var(--foreground)]">
            {children}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
