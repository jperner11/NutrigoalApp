import { createBrowserClient } from '@supabase/ssr'
import { withSupabaseReporting } from './withReporting'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return withSupabaseReporting(client)
}
