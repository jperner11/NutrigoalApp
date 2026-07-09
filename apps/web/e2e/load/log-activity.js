import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

// Write-path scenario: seeded users logging meals and workouts concurrently.
// Exercises Supabase auth + RLS-gated inserts (meal_logs / workout_logs) — the
// layer that actually hurts first at scale.
//
//   npm run load:users -w apps/web           # seed users → e2e/load/.users.json
//   k6 run -e E2E_SUPABASE_URL=https://<test-ref>.supabase.co \
//          -e E2E_SUPABASE_ANON_KEY=<anon> \
//          apps/web/e2e/load/log-activity.js
//
// TEST project only (the user pool can only come from the prod-guarded seeder).
// Rows cascade-delete with `npm run e2e:seed -w apps/web -- cleanup`.

const SUPA = __ENV.E2E_SUPABASE_URL
const ANON = __ENV.E2E_SUPABASE_ANON_KEY
const MAX_VUS = Number(__ENV.MAX_VUS || 30)

if (!SUPA || !ANON) {
  throw new Error('Set E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY (test project only)')
}

const users = new SharedArray('users', () => JSON.parse(open('./.users.json')))

export const options = {
  stages: [
    { duration: '30s', target: MAX_VUS },
    { duration: '2m', target: MAX_VUS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{kind:insert}': ['p(95)<600'],
  },
}

// Each VU signs in once and reuses its JWT for the whole run.
const tokens = {}

function signIn(user) {
  const res = http.post(
    `${SUPA}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { apikey: ANON, 'Content-Type': 'application/json' }, tags: { kind: 'auth' } },
  )
  check(res, { 'login 200': (r) => r.status === 200 })
  return res.json('access_token')
}

export default function () {
  const user = users[(__VU - 1) % users.length]
  if (!tokens[__VU]) tokens[__VU] = signIn(user)
  const headers = {
    apikey: ANON,
    Authorization: `Bearer ${tokens[__VU]}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
  const today = new Date().toISOString().slice(0, 10)

  const meal = http.post(
    `${SUPA}/rest/v1/meal_logs`,
    JSON.stringify({
      user_id: user.id,
      date: today,
      meal_type: ['breakfast', 'lunch', 'dinner', 'snack'][Math.floor(Math.random() * 4)],
      foods: [{ name: 'k6 load-test meal', grams: 100 }],
      total_calories: 450,
      total_protein: 30,
      total_carbs: 40,
      total_fat: 15,
    }),
    { headers, tags: { kind: 'insert' } },
  )
  check(meal, { 'meal insert 201': (r) => r.status === 201 })

  const workout = http.post(
    `${SUPA}/rest/v1/workout_logs`,
    JSON.stringify({
      user_id: user.id,
      date: today,
      exercises: [{ name: 'k6 squat', sets: [{ reps: 5, weight: 100 }] }],
      duration_minutes: 45,
    }),
    { headers, tags: { kind: 'insert' } },
  )
  check(workout, { 'workout insert 201': (r) => r.status === 201 })

  sleep(Math.random() * 3 + 1)
}
