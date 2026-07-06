import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const dayOfWeek = now.getUTCDay()

  const { data: schedules, error } = await supabase
    .from('feedback_schedules')
    .select('*, template:template_id(id, name, questions)')
    .eq('is_active', true)
    .eq('day_of_week', dayOfWeek)

  if (error || !schedules) {
    Sentry.captureException(error ?? new Error('No schedules returned'), { tags: { kind: 'cron', route: 'check-ins' } })
    return NextResponse.json({ message: error?.message ?? 'Failed to load schedules' }, { status: 500 })
  }

  let created = 0

  for (const schedule of schedules) {
    if (shouldSkip(schedule, now)) continue

    const template = schedule.template as { id: string; name: string; questions: unknown[] } | null
    if (!template) continue

    const { error: insertError } = await supabase.from('feedback_requests').insert({
      nutritionist_id: schedule.trainer_id,
      client_id: schedule.client_id,
      title: template.name,
      questions: template.questions,
      template_id: template.id,
      schedule_id: schedule.id,
      status: 'pending',
    })

    if (!insertError) {
      await supabase
        .from('feedback_schedules')
        .update({ last_triggered_at: now.toISOString() })
        .eq('id', schedule.id)
      created++
    }
  }

  return NextResponse.json({ created, checked: schedules.length })
}

function shouldSkip(
  schedule: { recurrence: string; last_triggered_at: string | null },
  now: Date,
): boolean {
  if (!schedule.last_triggered_at) return false

  const last = new Date(schedule.last_triggered_at)
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)

  if (schedule.recurrence === 'weekly' && daysSince < 6) return true
  if (schedule.recurrence === 'biweekly' && daysSince < 13) return true
  if (schedule.recurrence === 'monthly' && daysSince < 27) return true

  return false
}
