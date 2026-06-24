import { config } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Loads the E2E test environment from apps/web/.env.e2e — deliberately a SEPARATE
// file from .env.local so test runs never accidentally use production credentials.
//
// Safety: if the E2E Supabase URL matches the production URL in .env.local, we
// refuse to run unless E2E_ALLOW_PROD=1 is explicitly set. Seeding fake PTs and
// clients into the live database is the one mistake this whole layer must prevent.

const webRoot = resolve(__dirname, '..', '..')
const e2eEnvPath = resolve(webRoot, '.env.e2e')

// Local runs read apps/web/.env.e2e. CI (GitHub Actions) injects the same vars
// via secrets into process.env and has no file — so a missing file is only fatal
// if the vars aren't already present in the environment.
const hasEnvFile = existsSync(e2eEnvPath)
if (hasEnvFile) {
  config({ path: e2eEnvPath })
} else if (!process.env.E2E_SUPABASE_URL) {
  throw new Error(
    `Missing ${e2eEnvPath} and no E2E_* vars in the environment.\n` +
      `Locally: copy apps/web/e2e/.env.e2e.example to apps/web/.env.e2e and fill in a TEST ` +
      `Supabase project (never production).\n` +
      `In CI: set E2E_SUPABASE_URL / E2E_SUPABASE_SERVICE_ROLE_KEY / E2E_BASE_URL as secrets. ` +
      `See apps/web/e2e/README.md.`,
  )
}

function required(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required env var ${name} (set it in apps/web/.env.e2e locally, or as a CI secret).`,
    )
  }
  return value.trim()
}

// Best-effort read of the production URL from .env.local for the guard below.
function readProdSupabaseUrl(): string | null {
  const localPath = resolve(webRoot, '.env.local')
  if (!existsSync(localPath)) return null
  const match = readFileSync(localPath, 'utf-8')
    .split('\n')
    .find((line) => line.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
  return match ? match.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : null
}

const E2E_SUPABASE_URL = required('E2E_SUPABASE_URL')
const prodUrl = readProdSupabaseUrl()

if (prodUrl && prodUrl === E2E_SUPABASE_URL && process.env.E2E_ALLOW_PROD !== '1') {
  throw new Error(
    'REFUSING TO RUN: E2E_SUPABASE_URL matches the production NEXT_PUBLIC_SUPABASE_URL in .env.local.\n' +
      'Point E2E at a separate test Supabase project (or local supabase). If you truly intend to\n' +
      'run against this database, set E2E_ALLOW_PROD=1 — but you almost certainly should not.',
  )
}

export const e2eEnv = {
  supabaseUrl: E2E_SUPABASE_URL,
  serviceRoleKey: required('E2E_SUPABASE_SERVICE_ROLE_KEY'),
  // Public anon key of the TEST project. Only needed when Playwright starts the
  // app itself (webServer) so the browser-side Supabase client talks to the test
  // project. Not needed when E2E_BASE_URL points at an already-running deploy
  // that's configured against the test project. Empty string if unset.
  anonKey: (process.env.E2E_SUPABASE_ANON_KEY || '').trim(),
  baseUrl: required('E2E_BASE_URL').replace(/\/$/, ''),
  // Domain for synthetic test emails. These never need to receive mail because
  // we create users pre-confirmed via the admin API.
  emailDomain: (process.env.E2E_EMAIL_DOMAIN || 'e2e.treno.test').trim(),
}
