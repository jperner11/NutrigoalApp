'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Mail, UserCheck, Clock3, Copy, Send, Ban, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { isTrainerRole } from '@nutrigoal/shared'
import { AppHeroPanel, AppSectionHeader, EmptyStateCard, MetricCard } from '@/components/ui/AppDesign'
import { apiFetch, ApiError } from '@/lib/apiClient'

interface ActiveClientRow {
  id: string
  status: string
  invited_email: string | null
  created_at: string
  hasDietPlan?: boolean
  hasTrainingPlan?: boolean
  client: {
    id: string
    full_name: string | null
    email: string
    onboarding_completed: boolean
  } | null
}

interface PendingInviteRow {
  id: string
  invited_email: string
  client_first_name: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'
  expires_at: string
  last_sent_at: string
  created_at: string
  invite_token: string
}

function getAppOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export default function ClientsPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [activeClients, setActiveClients] = useState<ActiveClientRow[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return

    if (!isTrainerRole(profile.role)) {
      router.push('/dashboard')
      return
    }

    const trainerId = profile.id
    const supabase = createClient()

    async function loadClients() {
      const [{ data: clientRows }, { data: inviteRows }] = await Promise.all([
        supabase
          .from('nutritionist_clients')
          .select('id, status, invited_email, created_at, client:client_id(id, full_name, email, onboarding_completed)')
          .eq('nutritionist_id', trainerId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('personal_trainer_invites')
          .select('id, invited_email, client_first_name, status, expires_at, last_sent_at, created_at, invite_token')
          .eq('personal_trainer_id', trainerId)
          .in('status', ['pending', 'expired'])
          .order('created_at', { ascending: false }),
      ])

      const activeRows = (clientRows as unknown as ActiveClientRow[]) ?? []
      const clientIds = activeRows.map((row) => row.client?.id).filter(Boolean) as string[]

      let activeDietSet = new Set<string>()
      let activeTrainingSet = new Set<string>()

      if (clientIds.length > 0) {
        const [{ data: dietRows }, { data: trainingRows }] = await Promise.all([
          supabase.from('diet_plans').select('user_id').in('user_id', clientIds).eq('is_active', true),
          supabase.from('training_plans').select('user_id').in('user_id', clientIds).eq('is_active', true),
        ])

        activeDietSet = new Set((dietRows ?? []).map((row) => row.user_id))
        activeTrainingSet = new Set((trainingRows ?? []).map((row) => row.user_id))
      }

      setActiveClients(
        activeRows.map((row) => ({
          ...row,
          hasDietPlan: row.client?.id ? activeDietSet.has(row.client.id) : false,
          hasTrainingPlan: row.client?.id ? activeTrainingSet.has(row.client.id) : false,
        }))
      )
      setPendingInvites((inviteRows as PendingInviteRow[]) ?? [])
      setLoading(false)
    }

    loadClients()
  }, [profile, router])

  async function refreshInvites() {
    if (!profile) return
    const trainerId = profile.id
    const supabase = createClient()
    const { data } = await supabase
      .from('personal_trainer_invites')
      .select('id, invited_email, client_first_name, status, expires_at, last_sent_at, created_at, invite_token')
      .eq('personal_trainer_id', trainerId)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false })

    setPendingInvites((data as PendingInviteRow[]) ?? [])
  }

  async function resendInvite(inviteId: string) {
    setWorkingId(inviteId)
    try {
      await apiFetch(`/api/personal-trainer/invites/${inviteId}/resend`, {
        method: 'POST',
        context: { feature: 'clients', action: 'resend-invite', extra: { inviteId } },
      })
      toast.success('Invite resent.')
      await refreshInvites()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to resend invite.')
    } finally {
      setWorkingId(null)
    }
  }

  async function cancelInvite(inviteId: string) {
    setWorkingId(inviteId)
    try {
      await apiFetch(`/api/personal-trainer/invites/${inviteId}/cancel`, {
        method: 'POST',
        context: { feature: 'clients', action: 'cancel-invite', extra: { inviteId } },
      })
      toast.success('Invite canceled.')
      setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to cancel invite.')
    } finally {
      setWorkingId(null)
    }
  }

  async function copyInviteLink(token: string) {
    const shareUrl = `${getAppOrigin()}/invite/accept?token=${encodeURIComponent(token)}`
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Invite link copied.')
  }

  if (loading) return <div className="text-[var(--fg-3)]">Loading clients...</div>

  const needsAttentionCount = pendingInvites.filter((invite) => new Date(invite.expires_at).getTime() < Date.now()).length
  const missingPlanClients = activeClients.filter((client) => !client.hasDietPlan || !client.hasTrainingPlan)
  const intakePendingClients = activeClients.filter((client) => client.client && !client.client.onboarding_completed)
  const totalNeedsAttention = needsAttentionCount + missingPlanClients.length + intakePendingClients.length

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <AppHeroPanel
        eyebrow="N° 11 · Coach roster"
        title="Clients,"
        accent="in motion."
        subtitle={`${activeClients.length} active · ${pendingInvites.length} pending · ${totalNeedsAttention} need attention`}
        actions={
          <Link href="/clients/invite" className="btn btn-accent">
            <Plus className="h-4 w-4" />
            <span>Invite client</span>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active clients" value={activeClients.length} footer="Linked and manageable now." icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Pending invites" value={pendingInvites.length} footer="Still waiting to accept." icon={<Mail className="h-4 w-4" />} tone="muted" />
        <MetricCard label="Needs attention" value={totalNeedsAttention} footer="Expired invites or missing plans." icon={<AlertCircle className="h-4 w-4" />} tone={totalNeedsAttention > 0 ? 'warn' : 'success'} />
      </div>

      <section className="space-y-4">
        <AppSectionHeader
          index="01"
          eyebrow="ROSTER ACTIONS"
          title="Needs"
          accent="attention."
          summary="The fastest way to unblock activation and client follow-through."
        />

        {totalNeedsAttention === 0 ? (
          <EmptyStateCard title="No urgent roster actions right now." />
        ) : (
          <div className="space-y-3">
            {intakePendingClients.map((row) => (
              <Link
                key={`intake-pending-${row.id}`}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card flex items-center justify-between gap-4 p-5 transition hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-[var(--brand-100)] p-2">
                    <AlertCircle className="h-5 w-5 text-[var(--brand-400)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--fg)]">{row.client?.full_name ?? row.invited_email ?? 'Client'}</h3>
                    <p className="mt-1 text-sm text-[var(--fg-3)]">
                      Invite accepted, but the coach intake is still incomplete.
                    </p>
                  </div>
                </div>
                <span className="app-status-pill text-xs">
                  Intake pending
                </span>
              </Link>
            ))}

            {missingPlanClients.map((row) => (
              <Link
                key={`missing-plan-${row.id}`}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card flex items-center justify-between gap-4 p-5 transition hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-[var(--warning-bg)] p-2">
                    <AlertCircle className="h-5 w-5 text-[var(--warn)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--fg)]">{row.client?.full_name ?? row.invited_email ?? 'Client'}</h3>
                    <p className="mt-1 text-sm text-[var(--fg-3)]">
                      {!row.hasDietPlan && !row.hasTrainingPlan
                        ? 'No active diet or training plan assigned yet.'
                        : !row.hasDietPlan
                          ? 'Diet plan still needs assigning.'
                          : 'Training plan still needs assigning.'}
                    </p>
                  </div>
                </div>
                <span className="app-status-pill text-xs" style={{ color: 'var(--warn)' }}>
                  Needs plan
                </span>
              </Link>
            ))}

            {pendingInvites
              .filter((invite) => new Date(invite.expires_at).getTime() < Date.now())
              .map((invite) => (
                <div key={`expired-${invite.id}`} className="card flex items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-[var(--warning-bg)] p-2">
                      <Clock3 className="h-5 w-5 text-[var(--warn)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--fg)]">{invite.client_first_name || invite.invited_email}</h3>
                      <p className="mt-1 text-sm text-[var(--fg-3)]">Invite expired. Resend to restart onboarding.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => resendInvite(invite.id)}
                    disabled={workingId === invite.id}
                    className="btn btn-secondary"
                  >
                    <Send className="h-4 w-4" />
                    Resend
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          index="02"
          eyebrow="ACTIVE ROSTER"
          title="Active"
          accent="clients."
          summary="Clients who have accepted and are part of your working roster."
        />

        {activeClients.length === 0 ? (
          <EmptyStateCard
            icon={<Users className="h-7 w-7" />}
            title="No active clients yet."
            body="Send your first invite to start onboarding a client into the platform."
            action={
              <Link href="/clients/invite" className="btn btn-accent">
                <Mail className="h-5 w-5" />
                <span>Invite Client</span>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {activeClients.map((row) => (
              <Link
                key={row.id}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card flex items-center justify-between p-5 transition hover:border-[var(--line-strong)]"
              >
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-[var(--success-bg)] p-2">
                    <UserCheck className="h-5 w-5 text-[var(--ok)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--fg)]">
                      {row.client?.full_name ?? row.invited_email ?? 'Unknown'}
                    </h3>
                    <p className="text-sm text-[var(--fg-3)]">
                      {row.client?.email ?? row.invited_email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="app-status-pill text-xs" style={{ color: row.hasDietPlan ? 'var(--ok)' : 'var(--warn)' }}>
                        {row.hasDietPlan ? 'Diet assigned' : 'Diet needed'}
                      </span>
                      <span className="app-status-pill text-xs" style={{ color: row.hasTrainingPlan ? 'var(--ok)' : 'var(--warn)' }}>
                        {row.hasTrainingPlan ? 'Training assigned' : 'Training needed'}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="app-status-pill text-xs">
                  active
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          index="03"
          eyebrow="INVITES"
          title="Pending"
          accent="invites."
          summary="Clients who have been invited but have not accepted yet."
        />

        {pendingInvites.length === 0 ? (
          <EmptyStateCard title="No pending invites right now." />
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((invite) => {
              const expired = new Date(invite.expires_at).getTime() < Date.now()

              return (
                <div key={invite.id} className="card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full p-2 ${expired ? 'bg-[var(--warning-bg)]' : 'bg-[var(--ink-2)]'}`}>
                        {expired ? (
                          <AlertCircle className="h-5 w-5 text-[var(--warn)]" />
                        ) : (
                          <Clock3 className="h-5 w-5 text-[var(--fg-3)]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--fg)]">
                          {invite.client_first_name || invite.invited_email}
                        </h3>
                        <p className="text-sm text-[var(--fg-3)]">{invite.invited_email}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--fg-4)]">
                          <span>Sent {new Date(invite.last_sent_at).toLocaleDateString('en-GB')}</span>
                          <span>Expires {new Date(invite.expires_at).toLocaleDateString('en-GB')}</span>
                          <span className={expired ? 'font-semibold text-[var(--warn)]' : ''}>{expired ? 'Needs attention' : 'Awaiting client acceptance'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => resendInvite(invite.id)}
                        disabled={workingId === invite.id}
                        className="btn btn-secondary disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Resend
                      </button>
                      <button
                        onClick={() => copyInviteLink(invite.invite_token)}
                        className="btn btn-secondary"
                      >
                        <Copy className="h-4 w-4" />
                        Copy invite link
                      </button>
                      <button
                        onClick={() => cancelInvite(invite.id)}
                        disabled={workingId === invite.id}
                        className="btn btn-secondary text-[var(--brand-400)] disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
