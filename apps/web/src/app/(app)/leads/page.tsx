'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, Loader2, Mail, UserCheck, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { COACH_LEAD_STAGES, formatLeadStage } from '@/lib/coachMarketplace'
import { isTrainerRole } from '@treno/shared'
import { apiFetch, ApiError } from '@/lib/apiClient'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard, ListCard, MetricCard, StatusPill } from '@/components/ui/AppDesign'

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
      try {
        const payload = await apiFetch<{ leads?: LeadRecord[] }>('/api/coach-leads', {
          context: { feature: 'leads', action: 'list' },
        })
        setLeads(payload?.leads ?? [])
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load leads.')
      } finally {
        setLoading(false)
      }
    }

    loadLeads()
  }, [])

  const pendingLeads = useMemo(() => leads.filter((lead) => lead.status === 'pending'), [leads])
  const handledLeads = useMemo(() => leads.filter((lead) => lead.status !== 'pending'), [leads])

  async function handleLead(id: string, action: 'accept' | 'decline') {
    setWorkingId(id)
    try {
      await apiFetch(`/api/coach-leads/${id}/respond`, {
        method: 'POST',
        body: { action },
        context: { feature: 'leads', action: `respond-${action}`, extra: { leadId: id } },
      })
      toast.success(action === 'accept' ? 'Lead accepted and added to your client roster.' : 'Lead declined.')
      setLeads((prev) => prev.map((lead) => lead.id === id ? {
        ...lead,
        status: action === 'accept' ? 'accepted' : 'declined',
        stage: action === 'accept' ? 'won' : 'lost',
        responded_at: new Date().toISOString(),
      } : lead))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to ${action} lead.`)
    } finally {
      setWorkingId(null)
    }
  }

  async function updateLeadStage(id: string, stage: LeadRecord['stage']) {
    const previousLead = leads.find((lead) => lead.id === id)
    setLeads((prev) => prev.map((lead) => lead.id === id ? { ...lead, stage } : lead))

    try {
      await apiFetch(`/api/coach-leads/${id}/stage`, {
        method: 'PATCH',
        body: { stage },
        context: { feature: 'leads', action: 'update-stage', extra: { leadId: id, stage } },
      })
      toast.success(`Lead moved to ${formatLeadStage(stage)}.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update lead stage.')
      if (previousLead) {
        setLeads((prev) => prev.map((lead) => lead.id === id ? previousLead : lead))
      }
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <ListCard eyebrow="Loading" title="Pulling your marketplace leads.">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--acc)]" />
          </div>
        </ListCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <AppHeroPanel
        eyebrow="N° 13 · Marketplace"
        title="Leads,"
        accent="worth chasing."
        subtitle="Review incoming coaching requests and convert the right fits into managed clients."
        meta={
          <div className="app-card-topline min-w-[160px]">
            <span>PENDING</span>
            <span style={{ color: 'var(--acc)' }}>{pendingLeads.length}</span>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending" value={pendingLeads.length} footer="Waiting for your response." tone="muted" />
        <MetricCard label="Accepted" value={leads.filter((lead) => lead.status === 'accepted').length} footer="Added to your client roster." tone="success" />
        <MetricCard label="Declined" value={leads.filter((lead) => lead.status === 'declined').length} footer="Marketplace requests you passed on." tone="danger" />
      </div>

      <section className="space-y-4">
        <AppSectionHeader
          index="01"
          eyebrow="pending requests"
          title="Waiting on"
          accent="you."
          summary="These people are waiting for your response."
        />

        {pendingLeads.length === 0 ? (
          <EmptyStateCard
            icon={<Inbox className="h-7 w-7" />}
            title="No pending leads right now."
            body="Once your marketplace profile is live, incoming requests will appear here."
          />
        ) : (
          <div className="space-y-4">
            {pendingLeads.map((lead) => (
              <div key={lead.id} className="card p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--foreground)]">{lead.user?.full_name || lead.user?.email || 'Lead'}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--muted-soft)]">
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{lead.user?.email}</span>
                        <span>{new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Goal summary</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{lead.goal_summary}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Selected offer</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{lead.selected_offer_title || 'General coaching request'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Training background</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{lead.experience_level?.replace(/_/g, ' ') || lead.user?.training_experience?.replace(/_/g, ' ') || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Preferred format</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{lead.preferred_format || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Budget</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{lead.budget_label || 'Not specified'}</div>
                      </div>
                    </div>

                    {lead.message && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Message</div>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{lead.message}</p>
                      </div>
                    )}

                    <div className="max-w-[240px]">
                      <label
                        htmlFor={`pipeline-stage-${lead.id}`}
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]"
                      >
                        Pipeline stage
                      </label>
                      <select
                        id={`pipeline-stage-${lead.id}`}
                        value={lead.stage}
                        onChange={(e) => updateLeadStage(lead.id, e.target.value as LeadRecord['stage'])}
                        className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--muted)]"
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ok)] px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] hover:opacity-90 disabled:opacity-50"
                    >
                      {workingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      Accept lead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLead(lead.id, 'decline')}
                      disabled={workingId === lead.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
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
          <AppSectionHeader
            index="02"
            eyebrow="handled requests"
            title="Recently"
            accent="closed."
            summary="Accepted and declined marketplace requests."
          />

          <div className="space-y-3">
            {handledLeads.map((lead) => (
              <div key={lead.id} className="card-2 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">{lead.user?.full_name || lead.user?.email || 'Lead'}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{lead.goal_summary}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill tone={lead.status === 'accepted' ? 'success' : 'muted'}>{lead.status}</StatusPill>
                    <StatusPill tone="accent">{formatLeadStage(lead.stage)}</StatusPill>
                    {lead.status === 'accepted' && (
                      <Link href={`/clients/${lead.user_id}`} className="text-sm font-semibold text-[var(--acc-text)] hover:opacity-80">
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
