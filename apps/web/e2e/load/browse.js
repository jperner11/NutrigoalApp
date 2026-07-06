import http from 'k6/http'
import { check, sleep } from 'k6'

// Read-heavy scenario: what anonymous visitors + browsing users generate.
// Hits the app's public pages and the same PostgREST query /discover runs.
//
//   k6 run -e E2E_BASE_URL=https://<preview>.vercel.app \
//          -e E2E_SUPABASE_URL=https://<test-ref>.supabase.co \
//          -e E2E_SUPABASE_ANON_KEY=<anon> \
//          apps/web/e2e/load/browse.js
//
// TEST environment only — point E2E_BASE_URL at a preview deploy (or localhost)
// whose Supabase env is the throwaway test project, never production. Override
// intensity with -e MAX_VUS=200.

const BASE = __ENV.E2E_BASE_URL
const SUPA = __ENV.E2E_SUPABASE_URL
const ANON = __ENV.E2E_SUPABASE_ANON_KEY
const MAX_VUS = Number(__ENV.MAX_VUS || 50)

if (!BASE || !SUPA || !ANON) {
  throw new Error('Set E2E_BASE_URL, E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY (test project only)')
}

export const options = {
  stages: [
    { duration: '30s', target: Math.ceil(MAX_VUS / 5) },
    { duration: '1m', target: MAX_VUS },
    { duration: '2m', target: MAX_VUS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:page}': ['p(95)<2000'],
    'http_req_duration{kind:discover-query}': ['p(95)<800'],
  },
}

export default function () {
  const pages = ['/', '/find-coach', '/pricing', '/how-it-works']
  const page = pages[Math.floor(Math.random() * pages.length)]
  const res = http.get(`${BASE}${page}`, { tags: { kind: 'page' } })
  check(res, { 'page 200': (r) => r.status === 200 })

  // The marketplace listing query (same shape /discover and /find-coach issue).
  const q = http.get(
    `${SUPA}/rest/v1/coach_public_profiles` +
      '?select=coach_id,slug,headline,location_label,price_from,price_to,accepting_new_clients' +
      '&is_public=eq.true&accepting_new_clients=eq.true&limit=24',
    { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, tags: { kind: 'discover-query' } },
  )
  check(q, { 'discover 200': (r) => r.status === 200 })

  sleep(Math.random() * 2 + 0.5)
}
