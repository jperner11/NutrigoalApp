import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Client-side read-only listing of supplement plans assigned by a coach.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('supplement_plans')
    .select('*, items:supplement_plan_items(*)')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ plans: data ?? [] })
}
