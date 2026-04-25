'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Mail, UserCheck, Clock3, Copy, Send, Ban, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import AppPageHeader from '@/components/ui/AppPageHeader'
import { isTrainerRole } from '@nutrigoal/shared'

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
    const response = await fetch(`/api/personal-trainer/invites/${inviteId}/resend`, { method: 'POST' })
    const payload = await response.json().catch(() => null)
    setWorkingId(null)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to resend invite.')
      return
    }

    toast.success('Invite resent.')
    await refreshInvites()
  }

  async function cancelInvite(inviteId: string) {
    setWorkingId(inviteId)
    const response = await fetch(`/api/personal-trainer/invites/${inviteId}/cancel`, { method: 'POST' })
    const payload = await response.json().catch(() => null)
    setWorkingId(null)

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to cancel invite.')
      return
    }

    toast.success('Invite canceled.')
    setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
  }

  async function copyInviteLink(token: string) {
    const shareUrl = `${getAppOrigin()}/invite/accept?token=${encodeURIComponent(token)}`
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Invite link copied.')
  }

  if (loading) return <div className="text-gray-500">Loading clients...</div>

  const needsAttentionCount = pendingInvites.filter((invite) => new Date(invite.expires_at).getTime() < Date.now()).length
  const missingPlanClients = activeClients.filter((client) => !client.hasDietPlan || !client.hasTrainingPlan)
  const intakePendingClients = activeClients.filter((client) => client.client && !client.client.onboarding_completed)
  const totalNeedsAttention = needsAttentionCount + missingPlanClients.length + intakePendingClients.length

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={`${activeClients.length} active · ${pendingInvites.length} pending · ${totalNeedsAttention} need attention`}
        title="Your"
        accent="clients."
        actions={
          <Link href="/clients/invite" className="btn btn-accent">
            <Plus className="h-4 w-4" />
            <span>Invite client</span>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Active clients', activeClients.length, 'Clients currently linked and manageable now.'],
          ['Pending invites', pendingInvites.length, 'People who still need to accept their invite.'],
          ['Needs attention', totalNeedsAttention, 'Expired invites and active clients who still need plans assigned.'],
        ].map(([label, value, body]) => (
          <div key={label} className="glass-card rounded-[28px] p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{label}</div>
            <div className="mt-3 text-4xl font-bold text-[var(--foreground)]">{value}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Needs attention</h2>
          <p className="text-sm text-gray-600">The fastest way to unblock activation and client follow-through.</p>
        </div>

        {totalNeedsAttention === 0 ? (
          <div className="card p-10 text-center text-gray-500">
            No urgent roster actions right now.
          </div>
        ) : (
          <div className="space-y-3">
            {intakePendingClients.map((row) => (
              <Link
                key={`intake-pending-${row.id}`}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card flex items-center justify-between gap-4 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-sky-100 p-2">
                    <AlertCircle className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{row.client?.full_name ?? row.invited_email ?? 'Client'}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Invite accepted, but the coach intake is still incomplete.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  Intake pending
                </span>
              </Link>
            ))}

            {missingPlanClients.map((row) => (
              <Link
                key={`missing-plan-${row.id}`}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card flex items-center justify-between gap-4 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-amber-100 p-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{row.client?.full_name ?? row.invited_email ?? 'Client'}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {!row.hasDietPlan && !row.hasTrainingPlan
                        ? 'No active diet or training plan assigned yet.'
                        : !row.hasDietPlan
                          ? 'Diet plan still needs assigning.'
                          : 'Training plan still needs assigning.'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Needs plan
                </span>
              </Link>
            ))}

            {pendingInvites
              .filter((invite) => new Date(invite.expires_at).getTime() < Date.now())
              .map((invite) => (
                <div key={`expired-${invite.id}`} className="card flex items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-amber-100 p-2">
                      <Clock3 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{invite.client_first_name || invite.invited_email}</h3>
                      <p className="mt-1 text-sm text-gray-600">Invite expired. Resend to restart onboarding.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => resendInvite(invite.id)}
                    disabled={workingId === invite.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Active clients</h2>
            <p className="text-sm text-gray-600">Clients who have accepted and are part of your working roster.</p>
          </div>
        </div>

        {activeClients.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active clients yet</h3>
            <p className="text-gray-500 mb-6">Send your first invite to start onboarding a client into the platform.</p>
            <Link
              href="/clients/invite"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Mail className="h-5 w-5" />
              <span>Invite Client</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeClients.map((row) => (
              <Link
                key={row.id}
                href={row.client ? `/clients/${row.client.id}` : '#'}
                className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-sky-100 p-2">
                    <UserCheck className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {row.client?.full_name ?? row.invited_email ?? 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {row.client?.email ?? row.invited_email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.hasDietPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.hasDietPlan ? 'Diet assigned' : 'Diet needed'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.hasTrainingPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.hasTrainingPlan ? 'Training assigned' : 'Training needed'}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-sky-100 text-sky-700">
                  active
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pending invites</h2>
          <p className="text-sm text-gray-600">These clients have been invited but have not accepted yet.</p>
        </div>

        {pendingInvites.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">
            No pending invites right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((invite) => {
              const expired = new Date(invite.expires_at).getTime() < Date.now()

              return (
                <div key={invite.id} className="card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full p-2 ${expired ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {expired ? (
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Clock3 className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {invite.client_first_name || invite.invited_email}
                        </h3>
                        <p className="text-sm text-gray-500">{invite.invited_email}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>Sent {new Date(invite.last_sent_at).toLocaleDateString('en-GB')}</span>
                          <span>Expires {new Date(invite.expires_at).toLocaleDateString('en-GB')}</span>
                          <span className={expired ? 'text-amber-700 font-semibold' : ''}>{expired ? 'Needs attention' : 'Awaiting client acceptance'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => resendInvite(invite.id)}
                        disabled={workingId === invite.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Resend
                      </button>
                      <button
                        onClick={() => copyInviteLink(invite.invite_token)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                      >
                        <Copy className="h-4 w-4" />
                        Copy invite link
                      </button>
                      <button
                        onClick={() => cancelInvite(invite.id)}
                        disabled={workingId === invite.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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
