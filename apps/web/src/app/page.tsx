import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import BrandLogo from '@/components/brand/BrandLogo'
import PublicFooter from '@/components/marketing/PublicFooter'

const pillars = [
  {
    title: 'Personal systems, not generic plans',
    body: 'Every recommendation is shaped around goals, restrictions, schedule, recovery, and training context.',
    icon: Target,
  },
  {
    title: 'Nutrition and training in one engine',
    body: 'Meal planning, training structure, check-ins, and coaching all live inside one performance workflow.',
    icon: Dumbbell,
  },
  {
    title: 'Built for self-serve users and coaches',
    body: 'Users can run solo with AI or work with a coach, while Personal Trainers manage delivery and discovery from the same system.',
    icon: Users,
  },
]

const metrics = [
  { label: 'Profile depth', value: '60+' },
  { label: 'Ways to use the platform', value: '3' },
  { label: 'Core systems unified', value: '4' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(251,253,255,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              Pricing
            </Link>
            <Link href="/faq" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              FAQ
            </Link>
            <Link href="/support" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline-flex">
              Support
            </Link>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
              <span>Create account</span>
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
              Feel your momentum
            </div>
            <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.94] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              One place to build your plan
              <span className="block text-[var(--brand-500)]">or find the right coach.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Meal & Motion brings AI planning, coach-led delivery, and coach discovery into one clear nutrition and
              training system built to help people feel supported, steady, and in motion.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/signup" className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold">
                Start your performance setup
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-secondary inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold">
                Explore plans
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
              {metrics.map((item) => (
                <div key={item.label} className="surface-card p-5">
                  <div className="font-display text-3xl font-bold text-[var(--foreground)]">{item.value}</div>
                  <div className="mt-2 text-sm font-semibold text-[var(--muted)]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="panel-strong relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(29,168,240,0.08),transparent)]" />
              <div className="relative flex items-center justify-between rounded-[26px] bg-[var(--brand-900)] px-6 py-5 text-white shadow-[0_18px_45px_rgba(13,27,42,0.24)]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200/80">Adaptive engine</p>
                  <h2 className="mt-2 font-display text-3xl font-bold">Today’s performance brief</h2>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <div className="text-2xl font-bold text-[var(--brand-400)]">2,350</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-sky-100/70">Target kcal</div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-[var(--foreground)]">Nutrition compliance</h3>
                    <TrendingUp className="h-5 w-5 text-[var(--brand-500)]" />
                  </div>
                  <div className="mt-5 h-3 rounded-full bg-[var(--brand-200)]">
                    <div className="h-3 w-[76%] rounded-full bg-[linear-gradient(90deg,#1da8f0,#4dc4ff)]" />
                  </div>
                  <div className="mt-4 flex justify-between text-sm font-semibold text-[var(--muted)]">
                    <span>76% aligned this week</span>
                    <span>Protein ahead</span>
                  </div>
                </div>

                <div className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-[var(--foreground)]">Next session</h3>
                    <HeartPulse className="h-5 w-5 text-[var(--brand-500)]" />
                  </div>
                  <div className="mt-4 text-2xl font-bold text-[var(--foreground)]">Upper strength / 45 min</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Volume adjusted around recovery, sleep, and available equipment.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-2 text-sm font-semibold text-[#0f4262]">
                    <CheckCircle2 className="h-4 w-4" />
                    Clinically adjusted
                  </div>
                </div>
              </div>

              <div className="mt-5 surface-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="eyebrow">
                    <Brain className="h-4 w-4" />
                    AI coaching
                  </div>
                  <div className="eyebrow">
                    <Users className="h-4 w-4" />
                    Practitioner-ready
                  </div>
                  <div className="eyebrow">
                    <Compass className="h-4 w-4" />
                    Coach discovery beta
                  </div>
                  <div className="eyebrow">
                    <Dumbbell className="h-4 w-4" />
                    Training intelligence
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
            <div className="eyebrow mb-5">Why it feels different</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
              Built like a performance system, not a feature pile.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon
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
            <div className="eyebrow mb-5">For Personal Trainers</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">A cleaner system for clients, plans, and follow-through.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              Personal Trainers can invite clients, create meal and training plans, manage feedback, and
              keep communication in one place instead of stitching together five tools. Discover visibility, offers,
              and lead capture now sit beside client delivery so coaches can run both sides of the business in one product.
            </p>
            <div className="mt-8 space-y-4 text-base text-[var(--foreground)]">
              {[
                'Invite and manage clients from one roster',
                'Build structured meal and training plans inside the app',
                'Use AI and check-ins to keep the plan adaptive',
                'Show up in Discover and manage inbound leads',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-strong p-8">
            <div className="eyebrow mb-5">For self-serve users</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">An onboarding flow that actually powers the plan.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              The platform gathers the kind of context most apps ignore: injuries, schedule, training background,
              food dislikes, and recovery signals. That means self-serve plans feel believable instead of templated,
              and every individual plan can still discover the right coach if self-serve is not enough.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                'Meal structure',
                'Training structure',
                'Check-ins and progression',
                'Hydration and cardio',
              ].map((item) => (
                <div key={item} className="surface-card p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">System</div>
                  <div className="mt-2 font-display text-2xl font-bold text-[var(--foreground)]">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-strong p-8">
            <div className="eyebrow mb-5">Discover coaches</div>
            <h2 className="text-4xl font-bold text-[var(--foreground)]">Discover coaches who match the way you want to train.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              Users can browse Personal Trainers by focus, coaching style, format, and pricing, then request coaching
              inside Meal & Motion without leaving the product. Discover is available across all individual plans, including Free.
            </p>
            <div className="mt-8 space-y-4 text-base text-[var(--foreground)]">
              {[
                'Browse coaches by goal, format, and price range',
                'Compare specialties, style, and availability',
                'Send structured coaching requests instead of cold DMs',
                'Move accepted leads into the existing My Coach workflow',
              ].map((item) => (
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
