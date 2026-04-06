'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, Loader2, Mail, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { COACH_LEAD_STAGES, formatLeadStage } from '@/lib/coachMarketplace'
import { isTrainerRole } from '@nutrigoal/shared'

interface LeadRecord {
  id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined' | 'archived'
  stage: 'new' | 'contacted' | 'consult_booked' | 'won' | 'lost'
  goal_summary: string
  message: string | null
  budget_label: string | null
  preferred_format: string | null
  experience_level: string | null
  selected_offer_title: string | null
  created_at: string
  responded_at: string | null
  user: {
    id: string
    full_name: string | null
    email: string
    goal: string | null
    activity_level: string | null
    training_experience: string | null
    role: string
    personal_trainer_id: string | null
    nutritionist_id: string | null
  }
}

export default function LeadsPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    if (profile && !isTrainerRole(profile.role)) {
      router.push('/dashboard')
    }
  }, [profile, router])

  useEffect(() => {
    async function loadLeads() {
      const response = await fetch('/api/coach-leads')
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error ?? 'Failed to load leads.')
        setLoading(false)
        return
      }

      setLeads((payload?.leads as LeadRecord[]) ?? [])
      setLoading(false)
    }

    loadLeads()
  }, [])

  const pendingLeads = useMemo(() => leads.filter((lead) => lead.status === 'pending'), [leads])
  const handledLeads = useMemo(() => leads.filter((lead) => lead.status !== 'pending'), [leads])

  async function handleLead(id: string, action: 'accept' | 'decline') {
    setWorkingId(id)
    const response = await fetch(`/api/coach-leads/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const payload = await response.json().catch(() => null)
    setWorkingId(null)

    if (!response.ok) {
      toast.error(payload?.error ?? `Failed to ${action} lead.`)
      return
    }

    toast.success(action === 'accept' ? 'Lead accepted and added to your client roster.' : 'Lead declined.')
    setLeads((prev) => prev.map((lead) => lead.id === id ? {
      ...lead,
      status: action === 'accept' ? 'accepted' : 'declined',
      stage: action === 'accept' ? 'won' : 'lost',
      responded_at: new Date().toISOString(),
    } : lead))
  }

  async function updateLeadStage(id: string, stage: LeadRecord['stage']) {
    const previousLead = leads.find((lead) => lead.id === id)
    setLeads((prev) => prev.map((lead) => lead.id === id ? { ...lead, stage } : lead))

    const response = await fetch(`/api/coach-leads/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to update lead stage.')
      if (previousLead) {
        setLeads((prev) => prev.map((lead) => lead.id === id ? previousLead : lead))
      }
      return
    }

    toast.success(`Lead moved to ${formatLeadStage(stage)}.`)
  }

  if (loading) {
    return <div className="text-gray-500">Loading leads...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace Leads</h1>
          <p className="mt-1 text-gray-600">
            Review incoming coaching requests and convert the right fits into managed clients.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {pendingLeads.length} pending
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Pending', pendingLeads.length],
          ['Accepted', leads.filter((lead) => lead.status === 'accepted').length],
          ['Declined', leads.filter((lead) => lead.status === 'declined').length],
        ].map(([label, value]) => (
          <div key={label} className="glass-card rounded-[28px] p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{label}</div>
            <div className="mt-3 text-4xl font-bold text-[var(--foreground)]">{value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pending requests</h2>
          <p className="text-sm text-gray-600">These people are waiting for your response.</p>
        </div>

        {pendingLeads.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <Inbox className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No pending leads right now.</h3>
            <p className="mt-2 text-sm text-gray-500">Once your marketplace profile is live, incoming requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingLeads.map((lead) => (
              <div key={lead.id} className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{lead.user?.full_name || lead.user?.email || 'Lead'}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{lead.user?.email}</span>
                        <span>{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Goal summary</div>
                        <div className="mt-1 text-sm text-gray-700">{lead.goal_summary}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Selected offer</div>
                        <div className="mt-1 text-sm text-gray-700">{lead.selected_offer_title || 'General coaching request'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Training background</div>
                        <div className="mt-1 text-sm text-gray-700">{lead.experience_level?.replace(/_/g, ' ') || lead.user?.training_experience?.replace(/_/g, ' ') || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Preferred format</div>
                        <div className="mt-1 text-sm text-gray-700">{lead.preferred_format || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Budget</div>
                        <div className="mt-1 text-sm text-gray-700">{lead.budget_label || 'Not specified'}</div>
                      </div>
                    </div>

                    {lead.message && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Message</div>
                        <p className="mt-1 text-sm leading-6 text-gray-700">{lead.message}</p>
                      </div>
                    )}

                    <div className="max-w-[240px]">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Pipeline stage</div>
                      <select
                        value={lead.stage}
                        onChange={(e) => updateLeadStage(lead.id, e.target.value as LeadRecord['stage'])}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                      >
                        {COACH_LEAD_STAGES.filter((stage) => stage !== 'won' && stage !== 'lost').map((stage) => (
                          <option key={stage} value={stage}>{formatLeadStage(stage)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleLead(lead.id, 'accept')}
                      disabled={workingId === lead.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {workingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      Accept lead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLead(lead.id, 'decline')}
                      disabled={workingId === lead.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {handledLeads.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Handled requests</h2>
            <p className="text-sm text-gray-600">Recent accepted and declined marketplace requests.</p>
          </div>

          <div className="space-y-3">
            {handledLeads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{lead.user?.full_name || lead.user?.email || 'Lead'}</div>
                    <div className="mt-1 text-sm text-gray-600">{lead.goal_summary}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lead.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {lead.status}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {formatLeadStage(lead.stage)}
                    </span>
                    {lead.status === 'accepted' && (
                      <Link href={`/clients/${lead.user_id}`} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
                        Open client
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
