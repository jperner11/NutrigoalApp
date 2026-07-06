# Treno load tests (k6)

Two scenarios that answer "what breaks first when real users show up" — run them
against a **preview deploy + the TEST Supabase project**, never production.

Install k6 once: `brew install k6`.

## Prepare data

```bash
# volume in the marketplace (published coaches with linked clients):
npm run e2e:seed -w apps/web -- pairs 20 10

# a user pool for the write-path scenario → e2e/load/.users.json (gitignored):
npm run load:users -w apps/web -- 50
```

Everything is cleaned up afterwards with `npm run e2e:seed -w apps/web -- cleanup`
(logs cascade-delete with their users).

## Scenario 1 — read-heavy browse (`browse.js`)

Anonymous traffic: public pages + the /discover marketplace query. Ramps to
`MAX_VUS` (default 50) and holds for 2 minutes.

```bash
k6 run \
  -e E2E_BASE_URL=https://<preview>.vercel.app \
  -e E2E_SUPABASE_URL=https://<test-ref>.supabase.co \
  -e E2E_SUPABASE_ANON_KEY=<test anon key> \
  -e MAX_VUS=100 \
  apps/web/e2e/load/browse.js
```

Thresholds: <1% errors, page p95 < 2s, discover query p95 < 800ms.

Note: a Vercel preview URL may be behind Deployment Protection (SSO 302). Either
disable protection for that deployment, use a protection-bypass token, or run
against `http://localhost:3000` started with the test env.

## Scenario 2 — write path (`log-activity.js`)

Seeded users authenticating and logging meals + workouts concurrently — exercises
Supabase auth and the RLS-gated inserts, which is where scaling pain shows first.

```bash
k6 run \
  -e E2E_SUPABASE_URL=https://<test-ref>.supabase.co \
  -e E2E_SUPABASE_ANON_KEY=<test anon key> \
  -e MAX_VUS=30 \
  apps/web/e2e/load/log-activity.js
```

Thresholds: <2% errors, insert p95 < 600ms.

## When to run

Before each staging → prod promote (manually for now). After a run, check the
Supabase dashboard's Query Performance + run the performance advisors for missing
indexes / slow RLS policies at the new data volume.
