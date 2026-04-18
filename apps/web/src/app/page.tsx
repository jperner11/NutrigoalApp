import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import BrandLogo from '@/components/brand/BrandLogo'
import LandingCoachCta from '@/components/marketing/LandingCoachCta'
import PublicFooter from '@/components/marketing/PublicFooter'
import { landingCopy } from '@/lib/copy/landing'

const pillarIcons = [Target, Dumbbell, Users] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(251,253,255,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              {landingCopy.nav.pricing}
            </Link>
            <Link href="/faq" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              {landingCopy.nav.faq}
            </Link>
            <Link href="/support" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              {landingCopy.nav.support}
            </Link>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
              {landingCopy.nav.signIn}
            </Link>
            <Link href="/signup" className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
              <span>{landingCopy.nav.createAccount}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(29,168,240,0.18),transparent_36%),radial-gradient(circle_at_86%_12%,rgba(13,27,42,0.14),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="eyebrow mb-6">
              <Sparkles className="h-4 w-4" />
              {landingCopy.hero.eyebrow}
            </div>
            <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.94] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              {landingCopy.hero.titleLine1}
              <span className="block text-[var(--brand-500)]">{landingCopy.hero.titleLine2}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              {landingCopy.hero.subtitle}
            </p>
            <div className="mt-8 max-w-2xl">
              <LandingCoachCta />
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/find-coach" className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold">
                {landingCopy.hero.ctaPrimary}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/signup" className="btn-secondary inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold">
                {landingCopy.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="panel-strong relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(29,168,240,0.08),transparent)]" />
              <div className="relative flex items-center justify-between rounded-[26px] bg-[var(--brand-900)] px-6 py-5 text-white shadow-[0_18px_45px_rgba(13,27,42,0.24)]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200/80">{landingCopy.mockCard.kicker}</p>
                  <h2 className="mt-2 font-display text-3xl font-bold">{landingCopy.mockCard.title}</h2>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <div className="text-2xl font-bold text-[var(--brand-400)]">{landingCopy.mockCard.targetValue}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-sky-100/70">{landingCopy.mockCard.targetLabel}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-[var(--foreground)]">{landingCopy.mockCard.nutritionTitle}</h3>
                    <TrendingUp className="h-5 w-5 text-[var(--brand-500)]" />
                  </div>
                  <div className="mt-5 h-3 rounded-full bg-[var(--brand-200)]">
                    <div className="h-3 w-[76%] rounded-full bg-[linear-gradient(90deg,#1da8f0,#4dc4ff)]" />
                  </div>
                  <div className="mt-4 flex justify-between text-sm font-semibold text-[var(--muted)]">
                    <span>{landingCopy.mockCard.nutritionStatus}</span>
                    <span>{landingCopy.mockCard.nutritionNote}</span>
                  </div>
                </div>

                <div className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-[var(--foreground)]">{landingCopy.mockCard.nextWorkoutTitle}</h3>
                    <HeartPulse className="h-5 w-5 text-[var(--brand-500)]" />
                  </div>
                  <div className="mt-4 text-2xl font-bold text-[var(--foreground)]">{landingCopy.mockCard.nextWorkoutName}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {landingCopy.mockCard.nextWorkoutNote}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-2 text-sm font-semibold text-[#0f4262]">
                    <CheckCircle2 className="h-4 w-4" />
                    {landingCopy.mockCard.nextWorkoutBadge}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <div className="eyebrow mb-5">{landingCopy.pillars.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
              {landingCopy.pillars.title}
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {landingCopy.pillars.items.map((pillar, i) => {
              const Icon = pillarIcons[i]
              return (
                <div key={pillar.title} className="panel-strong p-8">
                  <div className="mb-6 inline-flex rounded-2xl bg-[var(--brand-100)] p-4 text-[var(--brand-900)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-[var(--foreground)]">{pillar.title}</h3>
                  <p className="mt-4 text-base leading-7 text-[var(--muted)]">{pillar.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <div className="panel-strong p-8">
            <div className="eyebrow mb-5">{landingCopy.coachSection.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">{landingCopy.coachSection.title}</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              {landingCopy.coachSection.body}
            </p>
            <div className="mt-8 space-y-4 text-base text-[var(--foreground)]">
              {landingCopy.coachSection.bullets.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-strong p-8">
            <div className="eyebrow mb-5">{landingCopy.individualSection.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">{landingCopy.individualSection.title}</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              {landingCopy.individualSection.body}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {landingCopy.individualSection.cards.map((item) => (
                <div key={item} className="surface-card p-5">
                  <div className="font-display text-xl font-bold text-[var(--foreground)]">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-strong p-8">
            <div className="eyebrow mb-5">{landingCopy.discoverSection.eyebrow}</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">{landingCopy.discoverSection.title}</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              {landingCopy.discoverSection.body}
            </p>
            <div className="mt-8 space-y-4 text-base text-[var(--foreground)]">
              {landingCopy.discoverSection.bullets.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
