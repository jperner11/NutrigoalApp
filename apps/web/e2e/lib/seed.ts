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

/**
 * Mint a password-recovery link for a seeded user — what the reset email would
 * contain — so F04 can prove the full forgot-password loop without an inbox.
 */
export async function generateRecoveryLink(email: string, redirectTo: string): Promise<string> {
  const supabase = admin()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })
  if (error || !data.properties?.action_link) {
    throw new Error(`Failed to generate recovery link for ${email}: ${error?.message ?? 'no link'}`)
  }
  return data.properties.action_link
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
 *
 * Mirrors BOTH writes the real accept route makes (respond/route.ts): the
 * `nutritionist_clients` row is what the "Nutritionists can view client profiles"
 * RLS policy (migration 001) actually checks, so without it a trainer's browser
 * session gets 0 rows back for their linked client despite personal_trainer_id
 * being set — only updating user_profiles isn't enough to make the client visible
 * to the trainer through the app's real RLS-gated queries.
 */
export async function linkClientToTrainer(clientId: string, trainerId: string): Promise<void> {
  const supabase = admin()
  const { error: relError } = await supabase
    .from('nutritionist_clients')
    .upsert(
      { nutritionist_id: trainerId, client_id: clientId, status: 'active' },
      { onConflict: 'nutritionist_id,client_id' },
    )
  if (relError) throw new Error(`Failed to link client ${clientId} to trainer ${trainerId}: ${relError.message}`)

  const { error } = await supabase
    .from('user_profiles')
    .update({ personal_trainer_id: trainerId, nutritionist_id: trainerId, role: 'personal_trainer_client' })
    .eq('id', clientId)
  if (error) throw new Error(`Failed to link client ${clientId} to trainer ${trainerId}: ${error.message}`)
}

/**
 * Insert a pending personal_trainer_invites row directly, bypassing the real
 * POST /api/personal-trainer/invites route. That route hard-requires
 * RESEND_API_KEY to send the invite email and fails closed when it's unset
 * (as it is in this e2e/CI environment — see GitHub issue for details), so
 * specs that need a real pending invite (F40) seed it here instead. Mirrors
 * the columns the real route inserts (migration 021), minus the email side
 * effect. Returns the invite_token so a test can drive /invite/accept for
 * real, exactly as a client clicking the emailed link would.
 */
export async function seedPendingInvite(trainerId: string, invitedEmail: string): Promise<string> {
  const supabase = admin()
  const token = `${TEST_PREFIX}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const { error } = await supabase.from('personal_trainer_invites').insert({
    personal_trainer_id: trainerId,
    invited_email: invitedEmail.toLowerCase(),
    invite_token: token,
  })
  if (error) throw new Error(`Failed to seed pending invite for ${invitedEmail}: ${error.message}`)
  return token
}

/**
 * Force a seeded user's tier directly (bypassing billing/Stripe entirely). The
 * signup trigger (migration 055) only ever bootstraps 'free' or 'personal_trainer'
 * from metadata, so Pro/Unlimited-gated specs (F15, F16) need this to get a
 * paid-tier client without touching real Stripe.
 */
export async function upgradeUserRole(userId: string, role: 'pro' | 'unlimited'): Promise<void> {
  const supabase = admin()
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(`Failed to upgrade user ${userId} to ${role}: ${error.message}`)
}

/** Read back a user's linked-trainer state after an accept/decline flow. */
export async function getTrainerLink(userId: string): Promise<{ role: string; personalTrainerId: string | null }> {
  const supabase = admin()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role, personal_trainer_id')
    .eq('id', userId)
    .single()
  if (error || !data) throw new Error(`Failed to read profile for ${userId}: ${error?.message ?? 'not found'}`)
  return { role: data.role, personalTrainerId: data.personal_trainer_id }
}

/**
 * Publish a marketplace profile for a seeded coach so they appear on /discover
 * and /find-coach. Slug carries the e2e prefix so cleanup can match it (rows also
 * cascade when the auth user is deleted).
 */
export async function publishCoachProfile(coachId: string, label: string): Promise<{ slug: string }> {
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
  return { slug }
}

/**
 * Seed an active custom intake question for a trainer (bypassing the real
 * /coach-questions UI), so a linked managed-client's onboarding wizard picks up
 * the extra "Coach Questions" step (see MANAGED_CLIENT_STEPS in
 * onboarding/page.tsx, gated on `coachCustomQuestions.length > 0`). Mirrors the
 * columns the real POST /api/personal-trainer/custom-intake/questions route
 * inserts (migration 026). Cascades away when the trainer's auth user is deleted.
 */
export async function seedCustomIntakeQuestion(
  trainerId: string,
  opts: {
    label: string
    type?: 'short_text' | 'long_text' | 'single_select' | 'multi_select' | 'yes_no'
    required?: boolean
    options?: string[]
  },
): Promise<{ id: string; label: string }> {
  const supabase = admin()
  const { data, error } = await supabase
    .from('personal_trainer_custom_intake_questions')
    .insert({
      trainer_id: trainerId,
      label: opts.label,
      type: opts.type ?? 'short_text',
      required: opts.required ?? false,
      options: opts.options ?? [],
      is_active: true,
    })
    .select('id, label')
    .single()
  if (error || !data) {
    throw new Error(`Failed to seed custom intake question for trainer ${trainerId}: ${error?.message ?? 'unknown error'}`)
  }
  return data
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

/**
 * Seed a one-day training plan for a client with a single exercise (from the
 * global `exercises` catalog seeded by migration 001, e.g. "Bench Press"), so
 * a workout-logging spec (F13) can jump straight to /training/session/<dayId>
 * without driving the "New Training Plan" builder UI. Cascades away when the
 * client's auth user is deleted.
 */
export async function seedTrainingDay(
  clientId: string,
  exerciseName = 'Bench Press',
): Promise<{ planDayId: string }> {
  const supabase = admin()

  const { data: exercise, error: exError } = await supabase
    .from('exercises')
    .select('id')
    .eq('name', exerciseName)
    .single()
  if (exError || !exercise) {
    throw new Error(`Failed to find seed exercise "${exerciseName}": ${exError?.message ?? 'not found'}`)
  }

  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({ user_id: clientId, created_by: clientId, name: 'E2E Training Plan', days_per_week: 1, is_active: true })
    .select()
    .single()
  if (planError || !plan) {
    throw new Error(`Failed to seed training plan: ${planError?.message ?? 'unknown error'}`)
  }

  const { data: planDay, error: dayError } = await supabase
    .from('training_plan_days')
    .insert({ training_plan_id: plan.id, day_number: 1, name: 'Day 1' })
    .select()
    .single()
  if (dayError || !planDay) {
    throw new Error(`Failed to seed training plan day: ${dayError?.message ?? 'unknown error'}`)
  }

  const { error: peError } = await supabase.from('training_plan_exercises').insert({
    plan_day_id: planDay.id,
    exercise_id: exercise.id,
    order_index: 0,
    sets: 3,
    reps: '8-12',
    rest_seconds: 90,
  })
  if (peError) throw new Error(`Failed to seed training plan exercise: ${peError.message}`)

  return { planDayId: planDay.id }
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
