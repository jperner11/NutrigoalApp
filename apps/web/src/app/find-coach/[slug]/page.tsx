import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Portrait from '@/components/ui/Portrait'
import {
  buildCoachProfileSlug,
  formatCoachPriceRange,
} from '@/lib/coachMarketplace'

interface CoachProfile {
  coach_id: string
  slug: string
  headline: string | null
  bio: string | null
  location_label: string | null
  price_from: number | null
  price_to: number | null
  currency: string | null
  accepting_new_clients: boolean
  consultation_url: string | null
  coach: {
    id: string
    full_name: string | null
    avatar_url: string | null
    coach_specialties: string[] | null
    coach_formats: string[] | null
    coach_check_in_frequency: string | null
    coach_ideal_client: string | null
    coach_style: string | null
  } | null
}

const initials = (name: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

async function getCoach(slug: string): Promise<CoachProfile | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_public_profiles')
    .select(`
      coach_id, slug, headline, bio, location_label,
      price_from, price_to, currency, accepting_new_clients, consultation_url,
      coach:coach_id (
        id, full_name, avatar_url,
        coach_specialties, coach_formats,
        coach_check_in_frequency, coach_ideal_client, coach_style
      )
    `)
    .eq('is_public', true)

  if (error || !data) return null

  type Row = Omit<CoachProfile, 'coach'> & { coach: CoachProfile['coach'] | CoachProfile['coach'][] }
  const row = (data as unknown as Row[]).find((r) => {
    const storedSlug = r.slug
    const computed = buildCoachProfileSlug(
      Array.isArray(r.coach) ? r.coach[0]?.full_name : r.coach?.full_name,
      r.coach_id,
    )
    return storedSlug === slug || computed === slug
  })
  if (!row) return null
  const coach = Array.isArray(row.coach) ? row.coach[0] ?? null : row.coach
  return { ...row, coach }
}

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await getCoach(slug)
  if (!profile) notFound()

  const name = profile.coach?.full_name || 'Coach'
  const tag =
    profile.headline ||
    (profile.coach?.coach_specialties || []).slice(0, 2).join(' · ')
  const loc = profile.location_label || ''
  const formats = (profile.coach?.coach_formats || []).join(' · ')
  const priceLabel = formatCoachPriceRange(
    profile.price_from,
    profile.price_to,
    profile.currency,
  )

  return (
    <section className="mx-auto max-w-[1320px] px-8 py-10">
      <Link
        href="/find-coach"
        className="btn btn-ghost"
        style={{ marginBottom: 24, padding: '6px 12px', fontSize: 12 }}
      >
        ← Back to discover
      </Link>

      <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr' }}>
            <Portrait seed={1} label={initials(name)} height={210} />
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--acc)',
                  letterSpacing: '0.14em',
                }}
              >
                VERIFIED ·{' '}
                {profile.accepting_new_clients
                  ? 'ACCEPTING NEW CLIENTS'
                  : 'WAITLIST OPEN'}
              </div>
              <h1
                className="h2 mt-2.5"
                style={{ fontSize: 56 }}
              >
                {name}
              </h1>
              <div
                className="mt-2"
                style={{ fontSize: 16, color: 'var(--fg-2)' }}
              >
                {tag}
                {loc && ` · ${loc}`}
              </div>
              {profile.coach?.coach_specialties &&
                profile.coach.coach_specialties.length > 0 && (
                  <div className="row mt-4 flex-wrap gap-1.5">
                    {profile.coach.coach_specialties.slice(0, 5).map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {profile.bio && (
            <>
              <div
                className="serif mt-10"
                style={{ fontSize: 28, lineHeight: 1.25 }}
              >
                &ldquo;{profile.bio.split('\n')[0]}&rdquo;
              </div>
              {profile.bio.split('\n').slice(1).join('\n').trim() && (
                <p
                  className="mt-4"
                  style={{
                    fontSize: 15,
                    color: 'var(--fg-2)',
                    lineHeight: 1.6,
                  }}
                >
                  {profile.bio.split('\n').slice(1).join('\n')}
                </p>
              )}
            </>
          )}

          <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
            {profile.coach?.coach_ideal_client && (
              <div className="card-2 p-3.5">
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.12em',
                  }}
                >
                  IDEAL CLIENT
                </div>
                <div className="mt-1.5" style={{ fontSize: 13 }}>
                  {profile.coach.coach_ideal_client}
                </div>
              </div>
            )}
            {profile.coach?.coach_check_in_frequency && (
              <div className="card-2 p-3.5">
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.12em',
                  }}
                >
                  CHECK-IN RHYTHM
                </div>
                <div className="mt-1.5" style={{ fontSize: 13 }}>
                  {profile.coach.coach_check_in_frequency}
                </div>
              </div>
            )}
            {formats && (
              <div className="card-2 p-3.5">
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.12em',
                  }}
                >
                  FORMAT
                </div>
                <div className="mt-1.5" style={{ fontSize: 13 }}>
                  {formats}
                </div>
              </div>
            )}
            {profile.coach?.coach_style && (
              <div className="card-2 p-3.5">
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.12em',
                  }}
                >
                  STYLE
                </div>
                <div className="mt-1.5" style={{ fontSize: 13 }}>
                  {profile.coach.coach_style}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card sticky top-24 p-6">
            <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
              {priceLabel}
            </div>
            {profile.consultation_url && (
              <a
                href={profile.consultation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-2 inline-block"
                style={{ fontSize: 12, color: 'var(--fg-3)', padding: 0 }}
              >
                Free consultation →
              </a>
            )}

            <Link
              href={`/find-coach/${profile.slug || buildCoachProfileSlug(name, profile.coach_id)}/request`}
              className="btn btn-accent mt-5 w-full justify-center"
            >
              Request coaching →
            </Link>

            <div className="divider my-5" />

            <div className="col gap-2.5">
              <div className="row justify-between">
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-4)',
                    letterSpacing: '0.08em',
                  }}
                >
                  STATUS
                </span>
                <span style={{ fontSize: 13 }}>
                  {profile.accepting_new_clients ? 'Accepting' : 'Waitlist'}
                </span>
              </div>
              {loc && (
                <div className="row justify-between">
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-4)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    LOCATION
                  </span>
                  <span style={{ fontSize: 13 }}>{loc}</span>
                </div>
              )}
              {formats && (
                <div className="row justify-between">
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--fg-4)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    FORMAT
                  </span>
                  <span style={{ fontSize: 13 }}>{formats}</span>
                </div>
              )}
            </div>
          </div>

          <div
            className="mt-4 rounded-2xl p-4"
            style={{
              border: '1px solid var(--line)',
              fontSize: 12,
              color: 'var(--fg-3)',
              lineHeight: 1.5,
            }}
          >
            No cold DMs. You send one structured request. {name.split(' ')[0]} reviews
            and either accepts, asks one question, or declines.
          </div>
        </div>
      </div>
    </section>
  )
}
