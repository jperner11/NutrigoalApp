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

/**
 * Assign a seeded client to a seeded trainer — the state the invite-accept flow
 * (F40) ends in. Lets multi-user specs and volume seeding skip the email invite.
 */
export async function linkClientToTrainer(clientId: string, trainerId: string): Promise<void> {
  const supabase = admin()
  const { error } = await supabase
    .from('user_profiles')
    .update({ personal_trainer_id: trainerId })
    .eq('id', clientId)
  if (error) throw new Error(`Failed to link client ${clientId} to trainer ${trainerId}: ${error.message}`)
}

/**
 * Publish a marketplace profile for a seeded coach so they appear on /discover
 * and /find-coach. Slug carries the e2e prefix so cleanup can match it (rows also
 * cascade when the auth user is deleted).
 */
export async function publishCoachProfile(coachId: string, label: string): Promise<void> {
  const supabase = admin()
  const slug = `${TEST_PREFIX}-${label}-${coachId.slice(0, 8)}`
  const { error } = await supabase.from('coach_public_profiles').upsert({
    coach_id: coachId,
    slug,
    is_public: true,
    headline: `E2E coach ${label}`,
    bio: 'Synthetic coach profile seeded for testing. Not a real person.',
    location_label: 'London, UK',
    price_from: 40,
    price_to: 80,
    accepting_new_clients: true,
  })
  if (error) throw new Error(`Failed to publish coach profile for ${coachId}: ${error.message}`)
}

export interface SeededPair {
  coach: SeededUser
  clients: SeededUser[]
}

/**
 * Mint one published coach plus `clientsPerCoach` clients already linked to them —
 * realistic marketplace volume for load tests and the multi-user (F40+) specs.
 */
export async function createLinkedPair(clientsPerCoach = 1): Promise<SeededPair> {
  const coach = await createTestUser('personal_trainer')
  await publishCoachProfile(coach.id, 'pair')
  const clients: SeededUser[] = []
  for (let i = 0; i < clientsPerCoach; i++) {
    const client = await createTestUser('free')
    await linkClientToTrainer(client.id, coach.id)
    clients.push(client)
  }
  return { coach, clients }
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
