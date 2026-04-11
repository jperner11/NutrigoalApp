import Link from 'next/link'
import { ExternalLink, MapPin, MessageSquare, UserCheck } from 'lucide-react'
import { formatCoachPriceRange } from '@/lib/coachMarketplace'
import { type MatchedCoachResult } from '@/lib/findCoach'

function getBadgeClasses(score: number) {
  if (score > 75) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (score > 50) return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function MatchedCoachCard({ match }: { match: MatchedCoachResult }) {
  const coachName = match.coach.full_name || 'Coach'
  const initial = coachName[0]?.toUpperCase() || 'C'
  const topOffer = match.offers[0]

  return (
    <article className="rounded-[30px] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white">
            {initial}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">{coachName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{match.headline || 'Personal coaching inside Meal & Motion'}</p>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${getBadgeClasses(match.score)}`}>
          {Math.round(match.score)}% match
        </div>
      </div>

      {match.reasons.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {match.reasons.map((reason) => (
            <span key={reason} className="rounded-full bg-[var(--brand-100)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-900)]">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {(match.coach.coach_specialties ?? []).slice(0, 4).map((item) => (
          <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
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
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[rgba(243,248,252,0.9)] p-4">
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
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-semibold text-sky-700"
          >
            <ExternalLink className="h-4 w-4" />
            Book consult
          </Link>
        ) : null}
      </div>
    </article>
  )
}
