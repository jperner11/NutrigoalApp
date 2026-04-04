'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Mail,
  MessageSquare,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'

interface TrainerDashboardProps {
  trainerId: string
  trainerName: string
}

interface ClientRow {
  id: string
  client_id: string | null
  invited_email: string | null
  status: string
  created_at: string
  client: {
    id: string
    full_name: string | null
    email: string
  } | null
}

interface ClientRowQuery {
  id: string
  client_id: string | null
  invited_email: string | null
  status: string
  created_at: string
  client: Array<{
    id: string
    full_name: string | null
    email: string
  }> | null
}

interface InviteRow {
  id: string
  invited_email: string
  status: string
  expires_at: string
  created_at: string
}

interface DashboardState {
  activeClients: ClientRow[]
  pendingInvites: InviteRow[]
  noPlanClients: ClientRow[]
  unreadMessages: number
  overdueFeedback: number
  recentActivity: Array<{
    id: string
    clientName: string
    label: string
    at: string
  }>
}

const initialState: DashboardState = {
  activeClients: [],
  pendingInvites: [],
  noPlanClients: [],
  unreadMessages: 0,
  overdueFeedback: 0,
  recentActivity: [],
}

function formatRelativeDate(value: string) {
  const date = new Date(value)
  const deltaMs = Date.now() - date.getTime()
  const deltaHours = Math.round(deltaMs / (1000 * 60 * 60))

  if (deltaHours < 1) return 'just now'
  if (deltaHours < 24) return `${deltaHours}h ago`
  const deltaDays = Math.round(deltaHours / 24)
  if (deltaDays < 7) return `${deltaDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function TrainerDashboard({ trainerId, trainerName }: TrainerDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<DashboardState>(initialState)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: clientRows } = await supabase
        .from('nutritionist_clients')
        .select('id, client_id, invited_email, status, created_at, client:client_id(id, full_name, email)')
        .eq('nutritionist_id', trainerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const { data: pendingInvites } = await supabase
        .from('personal_trainer_invites')
        .select('id, invited_email, status, expires_at, created_at')
        .eq('personal_trainer_id', trainerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      const activeClients: ClientRow[] = ((clientRows as ClientRowQuery[] | null) ?? []).map((row) => ({
        ...row,
        client: row.client?.[0] ?? null,
      }))
      const clientIds = activeClients.map((row) => row.client_id).filter(Boolean) as string[]

      const [
        { data: activeDietPlans },
        { data: activeTrainingPlans },
        { data: conversations },
        { data: feedbackRequests },
        { data: mealLogs },
        { data: workoutLogs },
      ] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('diet_plans').select('user_id').in('user_id', clientIds).eq('is_active', true)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from('training_plans').select('user_id').in('user_id', clientIds).eq('is_active', true)
          : Promise.resolve({ data: [] }),
        supabase.from('conversations').select('id, client_id').eq('nutritionist_id', trainerId),
        supabase
          .from('feedback_requests')
          .select('id, client_id, created_at, status')
          .eq('nutritionist_id', trainerId)
          .eq('status', 'pending'),
        clientIds.length > 0
          ? supabase.from('meal_logs').select('user_id, logged_at').in('user_id', clientIds).order('logged_at', { ascending: false }).limit(12)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from('workout_logs').select('user_id, logged_at').in('user_id', clientIds).order('logged_at', { ascending: false }).limit(12)
          : Promise.resolve({ data: [] }),
      ])

      const activeDietSet = new Set((activeDietPlans ?? []).map((plan) => plan.user_id))
      const activeTrainingSet = new Set((activeTrainingPlans ?? []).map((plan) => plan.user_id))
      const noPlanClients = activeClients.filter((row) => {
        if (!row.client_id) return false
        return !activeDietSet.has(row.client_id) || !activeTrainingSet.has(row.client_id)
      })

      const conversationRows = conversations ?? []
      const conversationIds = conversationRows.map((conversation) => conversation.id)
      let unreadMessages = 0
      if (conversationIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', trainerId)
          .is('read_at', null)
        unreadMessages = count ?? 0
      }

      const feedbackThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const overdueFeedback = (feedbackRequests ?? []).filter((request) => new Date(request.created_at) < feedbackThreshold).length

      const clientNameById = new Map(
        activeClients
          .filter((client) => client.client)
          .map((client) => [client.client!.id, client.client!.full_name || client.client!.email])
      )

      const recentActivity = [
        ...(mealLogs ?? []).map((log) => ({
          id: `meal-${log.user_id}-${log.logged_at}`,
          clientName: clientNameById.get(log.user_id) || 'Client',
          label: 'logged a meal',
          at: log.logged_at,
        })),
        ...(workoutLogs ?? []).map((log) => ({
          id: `workout-${log.user_id}-${log.logged_at}`,
          clientName: clientNameById.get(log.user_id) || 'Client',
          label: 'completed a workout',
          at: log.logged_at,
        })),
      ]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 6)

      setState({
        activeClients,
        pendingInvites: pendingInvites ?? [],
        noPlanClients,
        unreadMessages,
        overdueFeedback,
        recentActivity,
      })
      setLoading(false)
    }

    load()
  }, [trainerId])

  const attentionItems = useMemo(() => {
    return [
      {
        label: 'Pending invites',
        value: state.pendingInvites.length,
        body: 'Clients still waiting to accept and join your roster.',
        href: '/clients',
      },
      {
        label: 'Missing plans',
        value: state.noPlanClients.length,
        body: 'Active clients who still need a diet or training plan assigned.',
        href: '/clients',
      },
      {
        label: 'Unread messages',
        value: state.unreadMessages,
        body: 'Client conversations with unread replies.',
        href: '/clients',
      },
      {
        label: 'Overdue feedback',
        value: state.overdueFeedback,
        body: 'Pending check-ins older than three days.',
        href: '/clients',
      },
    ]
  }, [state])

  if (loading) {
    return <div className="text-[var(--muted)]">Loading trainer dashboard...</div>
  }

  return (
    <div className="space-y-8">
      <section className="panel-strong relative overflow-hidden p-8">
        <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(77,196,255,0.16),transparent_68%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-4">Practitioner home</div>
            <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">
              {trainerName}, here’s what needs attention today.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Keep the day simple: clear pending invites, assign plans to unprogrammed clients, and respond where momentum is slipping.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/clients/invite" className="btn-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold">
              <UserPlus className="h-4 w-4" />
              Invite client
            </Link>
            <Link href="/clients" className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold">
              <Users className="h-4 w-4" />
              Open roster
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {attentionItems.map((item) => (
          <Link key={item.label} href={item.href} className="glass-card rounded-[28px] p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">{item.label}</div>
            <div className="mt-3 text-4xl font-bold text-[var(--foreground)]">{item.value}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="panel-strong p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Roster snapshot</h2>
              <p className="text-sm text-[var(--muted)]">The clients who need the next action from you.</p>
            </div>
            <Link href="/clients" className="text-sm font-semibold text-[var(--brand-500)] hover:text-[var(--brand-900)]">
              View all
            </Link>
          </div>

          {state.activeClients.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-[var(--muted-soft)]" />
              <div className="mt-4 text-lg font-semibold text-[var(--foreground)]">No active clients yet</div>
              <p className="mt-2 text-sm text-[var(--muted)]">Start with an invite, then assign the first plan once they accept.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.activeClients.slice(0, 5).map((client) => {
                const needsPlans = state.noPlanClients.some((row) => row.id === client.id)
                return (
                  <Link
                    key={client.id}
                    href={client.client ? `/clients/${client.client.id}` : '/clients'}
                    className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white/72 px-4 py-4 transition hover:border-[rgba(29,168,240,0.28)] hover:bg-[var(--brand-100)]"
                  >
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">{client.client?.full_name || client.client?.email || client.invited_email}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {needsPlans ? 'Needs plan assignment' : 'Plans in place'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-500)]">
                      {needsPlans ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel-strong p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[var(--brand-500)]" />
              <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Today&apos;s tasks</h2>
            </div>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <TaskRow label="Review pending invites" value={state.pendingInvites.length} />
              <TaskRow label="Reply to unread client messages" value={state.unreadMessages} />
              <TaskRow label="Send overdue feedback follow-ups" value={state.overdueFeedback} />
              <TaskRow label="Assign missing plans" value={state.noPlanClients.length} />
            </div>
          </div>

          <div className="panel-strong p-6">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--brand-500)]" />
              <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Recent activity</h2>
            </div>
            {state.recentActivity.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Activity will start appearing here once clients begin logging meals and workouts.</p>
            ) : (
              <div className="space-y-3">
                {state.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <div className="font-medium text-[var(--foreground)]">{item.clientName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{item.label}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">{formatRelativeDate(item.at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-strong p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[var(--brand-500)]" />
              <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">Invites in motion</h2>
            </div>
            {state.pendingInvites.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No invites are waiting right now.</p>
            ) : (
              <div className="space-y-3">
                {state.pendingInvites.slice(0, 4).map((invite) => (
                  <div key={invite.id} className="rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <div className="font-medium text-[var(--foreground)]">{invite.invited_email}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Sent {formatRelativeDate(invite.created_at)} · expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function TaskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/72 px-4 py-3">
      <span>{label}</span>
      <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold text-[var(--brand-900)]">
        {value}
      </span>
    </div>
  )
}
