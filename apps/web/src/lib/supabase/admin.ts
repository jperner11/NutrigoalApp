import { createClient } from '@supabase/supabase-js'
import { withSupabaseReporting } from './withReporting'

export function createAdminClient() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return withSupabaseReporting(client)
}
