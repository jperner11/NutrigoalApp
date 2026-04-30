'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Compass, ExternalLink, Loader2, MapPin, MessageSquare, Search, SlidersHorizontal, UserCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { formatCoachPriceRange, formatOfferPrice } from '@/lib/coachMarketplace'
import {
  buildWizardBudgetLabel,
  buildWizardGoalSummary,
  clearLeadWizardPreferences,
  loadLeadWizardPreferences,
} from '@/lib/findCoach'
import { isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'
import AppPageHeader from '@/components/ui/AppPageHeader'
import Portrait from '@/components/ui/Portrait'
import { apiFetch, ApiError } from '@/lib/apiClient'

interface DiscoverCoach {
  coach_id: string
  slug: string
  headline: string | null
  bio: string | null
  location_label: string | null
  consultation_url: string | null
  price_from: number | null
  price_to: number | null
  currency: string
  accepting_new_clients: boolean
  offers: Array<{
    id: string
    title: string
    description: string | null
    price: number
    billing_period: string
    cta_label: string
  }>
  coach: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    coach_specialties: string[]
    coach_formats: string[]
    coach_services: string[]
    coach_style: string | null
    coach_check_in_frequency: string | null
    coach_ideal_client: string | null
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--ink-2)',
  border: '1px solid var(--line-2)',
  borderRadius: 12,
  fontSize: 14,
  color: 'var(--fg)',
  outline: 'none',
}

function getInitials(name: string | null) {
  return (name || 'C')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function DiscoverPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [coaches, setCoaches] = useState<DiscoverCoach[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState('all')
  const [selectedCoach, setSelectedCoach] = useState<DiscoverCoach | null>(null)
  const [leadWizardPreferences, setLeadWizardPreferences] = useState(loadLeadWizardPreferences())
  const [submitting, setSubmitting] = useState(false)
  const [leadForm, setLeadForm] = useState({
    goal_summary: '',
    preferred_format: '',
    budget_label: '',
    message: '',
    selected_offer_id: '',
  })

  useEffect(() => {
    if (profile && isTrainerRole(profile.role)) {
      router.push('/dashboard')
    }
  }, [profile, router])

  useEffect(() => {
    async function loadCoaches() {
      try {
        const payload = await apiFetch<{ profiles?: DiscoverCoach[] }>('/api/coach-profiles', {
          context: { feature: 'discover', action: 'list-coaches' },
        })
        setCoaches(payload?.profiles ?? [])
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load coaches.')
      } finally {
        setLoading(false)
      }
    }

    loadCoaches()
  }, [])

  const canRequestCoach = !!profile && !isTrainerRole(profile.role) && !isManagedClientRole(profile.role) && !profile.personal_trainer_id && !profile.nutritionist_id
  const availableFormats = useMemo(
    () => Array.from(new Set(coaches.flatMap((coach) => coach.coach?.coach_formats ?? []))),
    [coaches]
  )

  const filteredCoaches = useMemo(() => {
    const query = search.trim().toLowerCase()
    return coaches.filter((coach) => {
      const haystack = [
        coach.coach?.full_name,
        coach.headline,
        coach.location_label,
        coach.coach?.coach_ideal_client,
        ...(coach.coach?.coach_specialties ?? []),
        ...(coach.coach?.coach_services ?? []),
      ].filter(Boolean).join(' ').toLowerCase()

      const matchesSearch = query.length === 0 || haystack.includes(query)
      const matchesFormat = formatFilter === 'all' || (coach.coach?.coach_formats ?? []).includes(formatFilter)
      return matchesSearch && matchesFormat
    })
  }, [coaches, formatFilter, search])

  async function handleLeadSubmit() {
    if (!selectedCoach) return
    if (!leadForm.goal_summary.trim()) {
      toast.error('Add a short goal summary first.')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch('/api/coach-leads', {
        method: 'POST',
        body: {
          coach_id: selectedCoach.coach_id,
          goal_summary: leadForm.goal_summary,
          preferred_format: leadForm.preferred_format,
          budget_label: leadForm.budget_label,
          message: leadForm.message,
          selected_offer_id: leadForm.selected_offer_id || null,
          wizard_preferences: leadWizardPreferences,
        },
        context: { feature: 'discover', action: 'submit-lead', extra: { coachId: selectedCoach.coach_id } },
      })
      toast.success('Coaching request sent.')
      if (leadWizardPreferences) {
        clearLeadWizardPreferences()
        setLeadWizardPreferences(null)
      }
      setSelectedCoach(null)
      setLeadForm({ goal_summary: '', preferred_format: '', budget_label: '', message: '', selected_offer_id: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.14em' }}
        >
          LOADING
        </div>
        <div className="serif mt-2" style={{ fontSize: 24, color: 'var(--fg)' }}>
          Pulling the coach directory.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <AppPageHeader
        eyebrow="Discover coaches"
        title="Find a coach who"
        accent="matches your goal."
        subtitle="Browse public coach profiles by specialty, format, and price range, then send a structured coaching request inside Treno."
        chip={
          <span className="chip">
            {filteredCoaches.length} COACH{filteredCoaches.length !== 1 ? 'ES' : ''} SHOWN
          </span>
        }
      />

      {!canRequestCoach && (
        <div
          className="card-2 mb-6 p-5"
          style={{ background: 'var(--acc-soft)', borderColor: 'var(--acc)' }}
        >
          <div
            className="mono mb-1.5"
            style={{ fontSize: 10, color: 'var(--acc)', letterSpacing: '0.14em' }}
          >
            ✦ HEADS UP
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            {isManagedClientRole(profile?.role)
              ? 'You already have an active coach relationship, so discovery is view-only right now.'
              : 'Discovery requests are available for self-serve users. If you already have a coach linked, your next steps should happen in My Coach.'}
          </div>
        </div>
      )}

      {/* Search + format filter */}
      <div className="mb-6 grid gap-3 lg:grid-cols-[1.6fr_0.8fr]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--fg-4)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coach name, specialty, or ideal client"
            style={{ ...inputStyle, paddingLeft: 44 }}
          />
        </div>
        <div
          className="row gap-3"
          style={{
            padding: '8px 14px',
            background: 'var(--ink-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 12,
          }}
        >
          <SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--fg-4)' }} />
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="w-full"
            style={{
              fontSize: 14,
              color: 'var(--fg)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          >
            <option value="all">All formats</option>
            {availableFormats.map((format) => (
              <option key={format} value={format}>{format}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Coach grid */}
      {filteredCoaches.length === 0 ? (
        <div className="card p-12 text-center">
          <Compass
            className="mx-auto mb-3 h-10 w-10"
            style={{ color: 'var(--fg-4)' }}
          />
          <div className="serif" style={{ fontSize: 22 }}>
            No coaches{' '}
            <span className="italic-serif" style={{ color: 'var(--fg-3)' }}>
              match that filter yet.
            </span>
          </div>
          <p
            className="mt-2"
            style={{ fontSize: 13, color: 'var(--fg-2)' }}
          >
            Try a broader search or remove the format filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCoaches.map((coach, i) => {
            const coachName = coach.coach?.full_name || 'Coach'
            const initials = getInitials(coachName)
            const accepting = coach.accepting_new_clients

            return (
              <div key={coach.coach_id} className="card p-6">
                {/* Top row: portrait + name/headline + accepting chip */}
                <div className="row items-start justify-between gap-4">
                  <div className="row items-start gap-4">
                    <div style={{ width: 64, height: 64, flexShrink: 0 }}>
                      <Portrait seed={i} label={initials} height={64} />
                    </div>
                    <div className="min-w-0">
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>
                        {coachName}
                      </div>
                      <div
                        className="mt-1"
                        style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}
                      >
                        {coach.headline || 'Personal coaching inside Treno'}
                      </div>
                    </div>
                  </div>
                  <span
                    className="chip shrink-0"
                    style={{
                      color: accepting ? 'var(--ok)' : 'var(--warn)',
                    }}
                  >
                    ● {accepting ? 'Accepting' : 'Waitlist'}
                  </span>
                </div>

                {/* Specialties chips */}
                {(coach.coach?.coach_specialties ?? []).length > 0 && (
                  <div className="row mt-4 flex-wrap gap-1.5">
                    {(coach.coach?.coach_specialties ?? []).slice(0, 4).map((item) => (
                      <span key={item} className="chip">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats grid */}
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                    >
                      FORMATS
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 13, color: 'var(--fg-2)' }}
                    >
                      {(coach.coach?.coach_formats ?? []).join(', ') || 'Flexible'}
                    </div>
                  </div>
                  <div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                    >
                      PRICING
                    </div>
                    <div
                      className="serif mt-1"
                      style={{ fontSize: 15, color: 'var(--fg)' }}
                    >
                      {formatCoachPriceRange(coach.price_from, coach.price_to, coach.currency)}
                    </div>
                  </div>
                  <div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                    >
                      CHECK-INS
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 13, color: 'var(--fg-2)' }}
                    >
                      {coach.coach?.coach_check_in_frequency?.replace(/_/g, ' ') || 'Flexible'}
                    </div>
                  </div>
                  <div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.12em' }}
                    >
                      LOCATION
                    </div>
                    <div
                      className="row mt-1 gap-1.5"
                      style={{ fontSize: 13, color: 'var(--fg-2)' }}
                    >
                      <MapPin className="h-3 w-3" style={{ color: 'var(--fg-4)' }} />
                      <span>{coach.location_label || 'Online / remote'}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p
                  className="mt-5"
                  style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}
                >
                  {coach.bio || coach.coach?.coach_ideal_client || 'This coach has not added a detailed bio yet, but you can still send a structured request if the fit looks right.'}
                </p>

                {/* Offers */}
                {coach.offers.length > 0 && (
                  <div className="mt-5 col gap-2">
                    {coach.offers.slice(0, 2).map((offer) => (
                      <div key={offer.id} className="card-2 p-4">
                        <div className="row items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className="serif"
                              style={{ fontSize: 15, color: 'var(--fg)' }}
                            >
                              {offer.title}
                            </div>
                            <div
                              className="mt-1"
                              style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}
                            >
                              {offer.description || 'Public coaching offer'}
                            </div>
                          </div>
                          <div
                            className="serif shrink-0"
                            style={{ fontSize: 14, color: 'var(--acc)' }}
                          >
                            {formatOfferPrice(offer.price, coach.currency, offer.billing_period)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="row mt-6 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoach(coach)
                      setLeadForm((prev) => ({
                        ...prev,
                        selected_offer_id: '',
                        goal_summary: prev.goal_summary || (leadWizardPreferences ? buildWizardGoalSummary(leadWizardPreferences) : ''),
                        budget_label: prev.budget_label || (leadWizardPreferences ? buildWizardBudgetLabel(leadWizardPreferences) : ''),
                        message: prev.message || leadWizardPreferences?.additional_notes || '',
                      }))
                    }}
                    disabled={!canRequestCoach || !accepting}
                    className="btn btn-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Request coaching
                  </button>
                  {(coach.coach?.coach_services ?? []).length > 0 && (
                    <span
                      className="row gap-1.5"
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--fg-3)',
                        border: '1px solid var(--line-2)',
                        borderRadius: 12,
                      }}
                    >
                      <UserCheck className="h-3.5 w-3.5" style={{ color: 'var(--acc)' }} />
                      {(coach.coach?.coach_services ?? []).slice(0, 2).join(' · ')}
                    </span>
                  )}
                  {coach.consultation_url && (
                    <Link
                      href={coach.consultation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Book consult
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Request modal */}
      {selectedCoach && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(13, 27, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="card w-full max-w-2xl p-6">
            <div className="row items-start justify-between gap-4">
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--acc)', letterSpacing: '0.14em' }}
                >
                  ✦ REQUEST COACHING
                </div>
                <div
                  className="serif mt-2"
                  style={{ fontSize: 26, lineHeight: 1.15 }}
                >
                  {selectedCoach.coach?.full_name || 'Coach'}
                </div>
                <p
                  className="mt-2"
                  style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}
                >
                  {selectedCoach.headline || 'Tell the coach what you want help with and how you prefer to work.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCoach(null)}
                className="btn btn-ghost shrink-0"
              >
                Close
              </button>
            </div>

            <div className="col mt-6 gap-3.5">
              {selectedCoach.offers.length > 0 && (
                <div>
                  <label
                    className="mono mb-2 block"
                    style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                  >
                    CHOOSE AN OFFER
                  </label>
                  <select
                    value={leadForm.selected_offer_id}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, selected_offer_id: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">General coaching request</option>
                    {selectedCoach.offers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.title} · {formatOfferPrice(offer.price, selectedCoach.currency, offer.billing_period)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  WHAT DO YOU WANT HELP WITH? *
                </label>
                <input
                  type="text"
                  value={leadForm.goal_summary}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, goal_summary: e.target.value }))}
                  placeholder="e.g. Lose fat sustainably while keeping strength"
                  style={inputStyle}
                />
              </div>
              <div className="grid gap-3.5 md:grid-cols-2">
                <div>
                  <label
                    className="mono mb-2 block"
                    style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                  >
                    PREFERRED FORMAT
                  </label>
                  <input
                    type="text"
                    value={leadForm.preferred_format}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, preferred_format: e.target.value }))}
                    placeholder="Online, hybrid, in person"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label
                    className="mono mb-2 block"
                    style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                  >
                    BUDGET
                  </label>
                  <input
                    type="text"
                    value={leadForm.budget_label}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, budget_label: e.target.value }))}
                    placeholder="e.g. £100–£150 / month"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mono mb-2 block"
                  style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
                >
                  MESSAGE
                </label>
                <textarea
                  value={leadForm.message}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Anything useful about your schedule, experience, or what has not worked in the past."
                  style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="row mt-6 justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCoach(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeadSubmit}
                disabled={submitting}
                className="btn btn-accent disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Send request →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
