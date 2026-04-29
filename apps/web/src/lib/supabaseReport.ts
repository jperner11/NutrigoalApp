import * as Sentry from '@sentry/nextjs'
import type { PostgrestError } from '@supabase/supabase-js'

export type SupabaseContext = {
  feature?: string
  action?: string
  table?: string
  extra?: Record<string, unknown>
}

export function reportSupabaseError(
  error: PostgrestError | { message: string; code?: string; details?: string; hint?: string } | null | undefined,
  context: SupabaseContext = {},
): boolean {
  if (!error) return false
  const err = new Error(`[supabase] ${error.message}`)
  err.name = 'SupabaseError'
  Sentry.captureException(err, {
    tags: {
      kind: 'supabase',
      ...(context.feature && { feature: context.feature }),
      ...(context.action && { action: context.action }),
      ...(context.table && { table: context.table }),
      ...('code' in error && error.code ? { code: error.code } : {}),
    },
    extra: {
      message: error.message,
      ...('code' in error && { code: error.code }),
      ...('details' in error && { details: error.details }),
      ...('hint' in error && { hint: error.hint }),
      ...context.extra,
    },
  })
  return true
}

export async function runQuery<T>(
  builder: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  context: SupabaseContext = {},
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const result = await builder
  if (result.error) reportSupabaseError(result.error, context)
  return result
}
