'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Compass, ExternalLink, Loader2, MapPin, MessageSquare, Search, SlidersHorizontal, UserCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { formatCoachPriceRange, formatOfferPrice } from '@/lib/coachMarketplace'
import { isManagedClientRole, isTrainerRole } from '@nutrigoal/shared'

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

export default function DiscoverPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [coaches, setCoaches] = useState<DiscoverCoach[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState('all')
  const [selectedCoach, setSelectedCoach] = useState<DiscoverCoach | null>(null)
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
      const response = await fetch('/api/coach-profiles')
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error ?? 'Failed to load coaches.')
        setLoading(false)
        return
      }

      setCoaches((payload?.profiles as DiscoverCoach[]) ?? [])
      setLoading(false)
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
    const response = await fetch('/api/coach-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coach_id: selectedCoach.coach_id,
        goal_summary: leadForm.goal_summary,
        preferred_format: leadForm.preferred_format,
        budget_label: leadForm.budget_label,
        message: leadForm.message,
        selected_offer_id: leadForm.selected_offer_id || null,
      }),
    })

    const payload = await response.json().catch(() => null)
    setSubmitting(false)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to send request.')
      return
    }

    toast.success('Coaching request sent.')
    setSelectedCoach(null)
    setLeadForm({ goal_summary: '', preferred_format: '', budget_label: '', message: '', selected_offer_id: '' })
  }

  if (loading) {
    return <div className="text-gray-500">Loading coach discovery...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-4">Discover coaches</div>
          <h1 className="text-3xl font-bold text-gray-900">Find a coach who matches your goal.</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Browse public coach profiles by specialty, format, and price range, then send a structured coaching request inside Meal & Motion.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? 'es' : ''} shown
        </div>
      </div>

      {!canRequestCoach && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-sm leading-6 text-sky-900">
          {isManagedClientRole(profile?.role)
            ? 'You already have an active coach relationship, so discovery is view-only right now.'
            : 'Discovery requests are available for self-serve users. If you already have a coach linked, your next steps should happen in My Trainer.'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coach name, specialty, or ideal client"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">All formats</option>
            {availableFormats.map((format) => (
              <option key={format} value={format}>{format}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredCoaches.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <Compass className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">No coaches match that filter yet.</h2>
          <p className="mt-2 text-sm text-gray-500">Try a broader search or remove the format filter.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredCoaches.map((coach) => {
            const coachName = coach.coach?.full_name || 'Coach'
            const initial = coachName[0]?.toUpperCase() || 'C'
            return (
              <div key={coach.coach_id} className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white">
                      {initial}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{coachName}</h2>
                      <p className="mt-1 text-sm text-gray-600">{coach.headline || 'Personal coaching inside Meal & Motion'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coach.accepting_new_clients ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {coach.accepting_new_clients ? 'Accepting clients' : 'Waitlist only'}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(coach.coach?.coach_specialties ?? []).slice(0, 4).map((item) => (
                    <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Formats</div>
                    <div className="mt-1">{(coach.coach?.coach_formats ?? []).join(', ') || 'Flexible'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Pricing</div>
                    <div className="mt-1">{formatCoachPriceRange(coach.price_from, coach.price_to, coach.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Check-ins</div>
                    <div className="mt-1">{coach.coach?.coach_check_in_frequency?.replace(/_/g, ' ') || 'Flexible'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Location</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{coach.location_label || 'Online / remote'}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-gray-600">
                  {coach.bio || coach.coach?.coach_ideal_client || 'This coach has not added a detailed bio yet, but you can still send a structured request if the fit looks right.'}
                </p>

                {coach.offers.length > 0 && (
                  <div className="mt-5 grid gap-3">
                    {coach.offers.slice(0, 2).map((offer) => (
                      <div key={offer.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-gray-900">{offer.title}</div>
                            <div className="mt-1 text-sm text-gray-600">{offer.description || 'Public coaching offer'}</div>
                          </div>
                          <div className="text-sm font-semibold text-sky-700">
                            {formatOfferPrice(offer.price, coach.currency, offer.billing_period)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoach(coach)
                      setLeadForm((prev) => ({ ...prev, selected_offer_id: '' }))
                    }}
                    disabled={!canRequestCoach || !coach.accepting_new_clients}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Request coaching
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    {(coach.coach?.coach_services ?? []).slice(0, 2).join(' · ') || 'Coaching services listed in profile'}
                  </div>
                  {coach.consultation_url && (
                    <Link
                      href={coach.consultation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-semibold text-sky-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Book consult
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-600">Request coaching</div>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">{selectedCoach.coach?.full_name || 'Coach'}</h2>
                <p className="mt-2 text-sm text-gray-600">{selectedCoach.headline || 'Tell the coach what you want help with and how you prefer to work.'}</p>
              </div>
              <button type="button" onClick={() => setSelectedCoach(null)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600">
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {selectedCoach.offers.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Choose an offer</label>
                  <select
                    value={leadForm.selected_offer_id}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, selected_offer_id: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
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
                <label className="mb-1 block text-sm font-medium text-gray-700">What do you want help with?</label>
                <input
                  type="text"
                  value={leadForm.goal_summary}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, goal_summary: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  placeholder="e.g. Lose fat sustainably while keeping strength"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Preferred format</label>
                  <input
                    type="text"
                    value={leadForm.preferred_format}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, preferred_format: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    placeholder="Online, hybrid, in person"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Budget</label>
                  <input
                    type="text"
                    value={leadForm.budget_label}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, budget_label: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    placeholder="e.g. £100-£150/month"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={leadForm.message}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="min-h-[140px] w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  placeholder="Anything useful about your schedule, experience, or what has not worked in the past."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedCoach(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeadSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Send request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
