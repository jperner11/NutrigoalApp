import Link from 'next/link'
import { ExternalLink, MapPin, MessageSquare, UserCheck } from 'lucide-react'
import { formatCoachPriceRange } from '@/lib/coachMarketplace'
import { type MatchedCoachResult } from '@/lib/findCoach'

function getBadgeClasses(score: number) {
  if (score > 75) return 'bg-[rgba(26,163,122,0.14)] text-emerald-300 border-[rgba(26,163,122,0.35)]'
  if (score > 50) return 'bg-[rgba(196,121,28,0.14)] text-amber-300 border-[rgba(196,121,28,0.35)]'
  return 'bg-[var(--ink-2)] text-[var(--muted)] border-[var(--line)]'
}

export default function MatchedCoachCard({ match }: { match: MatchedCoachResult }) {
  const coachName = match.coach.full_name || 'Coach'
  const initial = coachName[0]?.toUpperCase() || 'C'
  const topOffer = match.offers[0]

  return (
    <article className="rounded-[30px] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-800)] text-lg font-bold text-white">
            {initial}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">{coachName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{match.headline || 'Personal coaching inside Treno'}</p>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${getBadgeClasses(match.score)}`}>
          {Math.round(match.score)}% match
        </div>
      </div>

      {match.reasons.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {match.reasons.map((reason) => (
            <span key={reason} className="rounded-full bg-[var(--brand-100)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-400)]">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {(match.coach.coach_specialties ?? []).slice(0, 4).map((item) => (
          <span key={item} className="rounded-full bg-[var(--ink-2)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Formats</div>
          <div className="mt-1">{match.coach.coach_formats.join(', ') || 'Flexible'}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Pricing</div>
          <div className="mt-1">{formatCoachPriceRange(match.price_from, match.price_to, match.currency)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Check-ins</div>
          <div className="mt-1">{match.coach.coach_check_in_frequency?.replace(/_/g, ' ') || 'Flexible'}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Location</div>
          <div className="mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[var(--muted-soft)]" />
            <span>{match.location_label || 'Online / remote'}</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
        {match.bio || match.coach.coach_ideal_client || 'This coach has not added a detailed bio yet, but the match still looks promising based on their profile and services.'}
      </p>

      {topOffer ? (
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Featured offer</div>
          <div className="mt-2 font-semibold text-[var(--foreground)]">{topOffer.title}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">{topOffer.description || 'Public coaching offer'}</div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/signup?next=/onboarding&wizard=true"
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <MessageSquare className="h-4 w-4" />
          Sign up to connect
        </Link>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--muted)]">
          <UserCheck className="h-4 w-4 text-[var(--brand-500)]" />
          {(match.coach.coach_services ?? []).slice(0, 2).join(' · ') || 'Coaching services listed in profile'}
        </div>
        {match.consultation_url ? (
          <Link
            href={match.consultation_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-400)]"
          >
            <ExternalLink className="h-4 w-4" />
            Book consult
          </Link>
        ) : null}
      </div>
    </article>
  )
}
