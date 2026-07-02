import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { e2eEnv } from './env'

// Admin-API seeding for E2E tests. Creates PRE-CONFIRMED users so tests skip the
// email-confirmation wall entirely (Supabase sends no email; the account is ready
// to log in immediately). The handle_new_user trigger reads the role from
// user_metadata, so a 'personal_trainer' here lands as a coach; anything else
// becomes a 'free' user (see migration 055).

export type SeedRole = 'personal_trainer' | 'free'

export interface SeededUser {
  id: string
  email: string
  password: string
  role: SeedRole
}

// All synthetic emails share this prefix so cleanup can find them unambiguously.
const TEST_PREFIX = 'treno-e2e'

function admin(): SupabaseClient {
  return createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function makeEmail(role: SeedRole): string {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const tag = role === 'personal_trainer' ? 'pt' : 'client'
  return `${TEST_PREFIX}+${tag}-${stamp}@${e2eEnv.emailDomain}`
}

/**
 * Delete a test user by email. Used by the UI-signup spec, which creates the user
 * through the app (so it never learns the id) but must clean up after itself.
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  const supabase = admin()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data.users.length) return
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      await supabase.auth.admin.deleteUser(match.id)
      return
    }
    if (data.users.length < 200) return
  }
}

export async function createTestUser(
  role: SeedRole,
  opts: { fullName?: string; password?: string } = {},
): Promise<SeededUser> {
  const supabase = admin()
  const email = makeEmail(role)
  const password = opts.password ?? `Test!${Math.random().toString(36).slice(2, 10)}A1`
  const fullName = opts.fullName ?? (role === 'personal_trainer' ? 'E2E Coach' : 'E2E Client')

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed → no email step
    user_metadata: { role, full_name: fullName },
  })

  if (error || !data.user) {
    throw new Error(`Failed to create ${role} test user: ${error?.message ?? 'unknown error'}`)
  }

  return { id: data.user.id, email, password, role }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const supabase = admin()
  // user_profiles.id REFERENCES auth.users(id) ON DELETE CASCADE, so deleting the
  // auth user tears down the profile and its cascading rows.
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Failed to delete test user ${userId}: ${error.message}`)
  }
}

// Deletes every synthetic user this layer ever created (matched by the TEST_PREFIX
// in their email). Safe to run before or after a test run to keep the test DB clean.
export async function cleanupAllTestUsers(): Promise<number> {
  const supabase = admin()
  let removed = 0
  let page = 1
  // listUsers is paginated; walk every page and delete matches.
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Failed to list users: ${error.message}`)
    const matches = data.users.filter((u) => (u.email ?? '').startsWith(`${TEST_PREFIX}+`))
    for (const u of matches) {
      await deleteTestUser(u.id)
      removed += 1
    }
    if (data.users.length < 200) break
    page += 1
  }
  return removed
}
