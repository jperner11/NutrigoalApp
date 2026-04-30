/**
 * Seeds 2 test coach accounts with published marketplace profiles.
 *
 * Usage (from apps/web/):
 *   npx tsx scripts/seed-test-coaches.ts
 *
 * Reads .env.local from apps/web/ automatically.
 *
 * Idempotent: if a user with the email already exists, the script reuses
 * their account and refreshes the profile + marketplace listing.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Manual .env.local loader (works on Node < 20.6 without --env-file flag)
function loadDotenv(path: string) {
  let content: string
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadDotenv(resolve(process.cwd(), '.env.local'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).',
  )
  console.error('Make sure you run this from apps/web/ where .env.local lives.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface SeedCoach {
  email: string
  password: string
  full_name: string
  headline: string
  bio: string
  location_label: string
  price_from: number
  price_to: number | null
  currency: string
  coach_specialties: string[]
  coach_formats: string[]
  coach_services: string[]
  coach_style: string
  coach_check_in_frequency: string
  coach_ideal_client: string
}

const COACHES: SeedCoach[] = [
  {
    email: 'coach.marcus@treno.test',
    password: 'TestCoach!2026',
    full_name: 'Marcus Liao',
    headline: 'Powerlifting & hybrid coaching',
    bio: `"I coach lifters who want to compete — or lift like they could."

Twelve years coaching, eight as a competitive powerlifter. I take intermediates from stuck plateaus to regional meets. Programming is conjugate-style with weekly autoregulation; expect detailed video review.`,
    location_label: 'London · Hybrid',
    price_from: 140,
    price_to: 180,
    currency: 'GBP',
    coach_specialties: ['Strength training', 'Powerlifting', 'Hybrid'],
    coach_formats: ['Online', 'In person'],
    coach_services: ['Training plans', 'Check-ins', 'Form review'],
    coach_style: 'Direct, evidence-based, autoregulated',
    coach_check_in_frequency: 'weekly',
    coach_ideal_client: 'Intermediate lifters with 2+ years of training, ready to compete',
  },
  {
    email: 'coach.camila@treno.test',
    password: 'TestCoach!2026',
    full_name: 'Camila Ferreira',
    headline: 'Strength & postpartum coaching',
    bio: `Eight years coaching women through the postpartum return-to-strength window. Nutrition-first, with training that respects recovery.

I work best with women who want clarity and structure, not Instagram diet culture.`,
    location_label: 'São Paulo · Remote',
    price_from: 90,
    price_to: 130,
    currency: 'GBP',
    coach_specialties: ['Strength training', 'Postpartum', 'Nutrition guidance'],
    coach_formats: ['Online'],
    coach_services: ['Training plans', 'Nutrition guidance', 'Habit coaching', 'Check-ins'],
    coach_style: 'Patient, recovery-aware, sustainable',
    coach_check_in_frequency: 'weekly',
    coach_ideal_client: 'New mothers and women returning to strength training after a break',
  },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSlug(name: string, coachId: string) {
  return `${slugify(name)}-${coachId.slice(0, 6)}`
}

async function findUserByEmail(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function ensureUser(coach: SeedCoach) {
  const existing = await findUserByEmail(coach.email)
  if (existing) {
    console.log(`  · user exists, reusing (${existing.id})`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: coach.email,
    password: coach.password,
    email_confirm: true,
    user_metadata: {
      role: 'personal_trainer',
      full_name: coach.full_name,
    },
  })
  if (error) throw error
  console.log(`  · user created (${data.user.id})`)
  return data.user.id
}

async function ensureProfile(userId: string, coach: SeedCoach) {
  const { error } = await admin
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        email: coach.email,
        role: 'personal_trainer',
        full_name: coach.full_name,
        onboarding_completed: true,
        coach_specialties: coach.coach_specialties,
        coach_formats: coach.coach_formats,
        coach_services: coach.coach_services,
        coach_style: coach.coach_style,
        coach_check_in_frequency: coach.coach_check_in_frequency,
        coach_ideal_client: coach.coach_ideal_client,
      },
      { onConflict: 'id' },
    )
  if (error) throw error
  console.log(`  · profile upserted`)
}

async function ensureCoachPackage(userId: string) {
  const { error } = await admin
    .from('nutritionist_packages')
    .upsert(
      { nutritionist_id: userId, max_clients: 15 },
      { onConflict: 'nutritionist_id' },
    )
  if (error && !error.message.includes('does not exist')) {
    console.warn(`  · package upsert skipped: ${error.message}`)
  } else {
    console.log(`  · package ensured`)
  }
}

async function ensurePublicProfile(userId: string, coach: SeedCoach) {
  const slug = buildSlug(coach.full_name, userId)
  const { error } = await admin
    .from('coach_public_profiles')
    .upsert(
      {
        coach_id: userId,
        slug,
        is_public: true,
        headline: coach.headline,
        bio: coach.bio,
        location_label: coach.location_label,
        price_from: coach.price_from,
        price_to: coach.price_to,
        currency: coach.currency,
        accepting_new_clients: true,
      },
      { onConflict: 'coach_id' },
    )
  if (error) throw error
  console.log(`  · public profile published (slug: ${slug})`)
  return slug
}

async function main() {
  console.log(`Seeding ${COACHES.length} coach test accounts…\n`)

  const results: Array<{ email: string; password: string; slug: string }> = []

  for (const coach of COACHES) {
    console.log(`→ ${coach.full_name} (${coach.email})`)
    const userId = await ensureUser(coach)
    await ensureProfile(userId, coach)
    await ensureCoachPackage(userId)
    const slug = await ensurePublicProfile(userId, coach)
    results.push({ email: coach.email, password: coach.password, slug })
    console.log('')
  }

  console.log('━'.repeat(60))
  console.log('Done. Coach test credentials:\n')
  for (const r of results) {
    console.log(`  email:    ${r.email}`)
    console.log(`  password: ${r.password}`)
    console.log(`  profile:  /find-coach/${r.slug}`)
    console.log('')
  }
  console.log('Visit /find-coach to confirm both appear in the directory.')
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message || err)
  process.exit(1)
})
