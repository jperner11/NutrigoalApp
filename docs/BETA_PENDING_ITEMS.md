# Beta — Pending Items

Captured 2026-05-02 after Stripe end-to-end was verified working in sandbox. Updated 2026-05-02 after checkout-intent and branded 404 fixes. Each section is self-contained — hand any one to an agent without prior context.

---

## 1. Reconcile Supabase migration state

**Problem.** Production Supabase has the schema in place (app works), but the `supabase_migrations.schema_migrations` tracking table is **empty** — `npx supabase migration list` shows every local migration (001–052) as unapplied on remote. We've been hitting this as one-off bugs:

- `user_profiles.trial_ends_at` missing (migration 020 — patched directly via SQL)
- `user_profiles.role` and `subscriptions.plan_type` CHECK constraints missing the newer roles like `unlimited`, `personal_trainer` (migrations 013 + 021 — patched directly via SQL)

There are likely more. Until the migration table reflects reality, you cannot safely run `supabase db push` and the next migration you write may collide with existing schema.

**Goal.** Get `npx supabase migration list` to show every applied migration in both Local and Remote columns, then push only the truly missing ones.

**Approach.**
1. Inspect the actual production schema via `supabase db dump --schema public` or by querying `information_schema` — compare against each migration to determine which ones are effectively applied.
2. For each migration that's already applied: `npx supabase migration repair --status applied <version>` (this writes to `schema_migrations` without re-running the SQL).
3. For migrations that are *not* applied (data drift), evaluate one by one — some may be safe to run, others may need editing or skipping.
4. Run `npx supabase db push` for the remainder. Verify each applied cleanly.
5. After reconciliation, `migration list` should show full alignment.

**Risk.** This touches production. Take a snapshot/backup first via the Supabase dashboard. Migrations that use `CREATE TABLE` (no `IF NOT EXISTS`) or that assume a clean slate can fail or, worse, silently corrupt data if mis-applied. Read each migration carefully before deciding.

**Project ref.** `tfjliscxqeonfdlmdqjl`. Local migrations: `apps/web/supabase/migrations/`.

**Already linked locally.** `npx supabase link --project-ref tfjliscxqeonfdlmdqjl` has been run; `SUPABASE_ACCESS_TOKEN` may need to be re-exported.

---

## 2. Remaining env vars

- **Preview-env Stripe vars** — production Stripe vars are set, but preview deploys still don't have them. The CLI flow with `--yes --git-branch` was rejected by a Claude plugin wrapper. Add via the Vercel dashboard: project → Settings → Environment Variables → tick "Preview" for each of `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_UNLIMITED`, `STRIPE_PRICE_NUTRITIONIST`. Use the same sandbox values as production for now.

---

## 3. Live-mode Stripe swap (do this when ready to charge)

**Current state.** Stripe is in **sandbox/test mode** (`acct_1TShIWFolbDDQeDL`). All keys and price IDs in Vercel production env are `pk_test_*` / `sk_test_*` / `whsec_*` from sandbox.

**Steps to flip live.**
1. Complete Stripe KYC: dashboard → "Verify your business" banner → submit business details, bank info, identity. Takes a few days for review.
2. Once activated, recreate the 3 products in **live** mode (sandbox products do not migrate). Same names: Pro $4.99, Unlimited $9.99, Coach Pro $24.99 — monthly recurring, USD.
3. Get **live keys** (Developers → API keys, no sandbox toggle): `pk_live_*` and `sk_live_*`.
4. Create a **live webhook** at `https://www.mealandmotion.com/api/webhooks/stripe`, subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Get the `whsec_*` for live.
5. Update Vercel production env vars:
   - `STRIPE_SECRET_KEY` → live
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → live
   - `STRIPE_WEBHOOK_SECRET` → live
   - `STRIPE_PRICE_PRO`, `_UNLIMITED`, `_NUTRITIONIST` → live price IDs
6. Redeploy production.
7. Smoke-test with a **real card** (don't refund yourself; Stripe takes processing fees on test live charges). Verify role flip and webhook delivery.
8. Keep sandbox keys somewhere accessible if you ever need to debug — they're in `.env.local` for local dev.

**Don't forget.** Update `apps/web/src/lib/site.ts` if any links/copy reference test mode. Resolve the open `mealandmotion.sentry.io` issues.

---

## 4. Other beta-blockers from the audit (lower priority)

From the earlier full audit. None of these are critical for closed beta but should land before "open" beta:

- **In-memory rate limiter** (`apps/web/src/lib/rateLimit.ts`) resets on every Vercel cold start and doesn't span instances. Acceptable at low traffic; replace with Upstash or a Supabase-backed counter before scaling.
- **`api/admin/grant-unlimited`** — Bearer-token auth with no rate limit. Brute-force depends on `ADMIN_SECRET` length only. Add rate limiting or IP allowlist.
- **RLS spot-check** — 16 migrations create RLS policies but nothing has been formally audited. Highest-risk tables: `coach_leads`, `personal_trainer_invites`, anything cross-user. Verify a user can't read another user's rows via the anon key.
- **Lint/typecheck health** — `apps/web/eslint.config.mjs` exists, but `next lint`/`eslint` hung during the 2026-05-02 checkout-intent work. `npx tsc --noEmit` also fails on unrelated existing issues in `.next/types`, `coach-questions/page.tsx`, and `api/personal-trainer/custom-intake/...`. Clean these up so verification becomes reliable again.

---

## What's already done (so agents don't redo it)

- ✅ `user_profiles.trial_ends_at` column added in prod
- ✅ Stripe sandbox configured: 3 products, keys, webhook, env vars in Vercel **production**, also in `apps/web/.env.local`
- ✅ Middleware: returns 401 JSON for unauth API routes; `/api/webhooks/*` and `/api/cron/*` carved out as public
- ✅ CHECK constraints expanded on `user_profiles.role` and `subscriptions.plan_type` to include all 7 roles
- ✅ End-to-end checkout verified: Stripe sandbox → webhook → Supabase → role flip
- ✅ Sentry wired up; the `trial_ends_at` and `/pricing` 500 issues should be resolved (verify in dashboard)
- ✅ Unauthed paid-plan clicks on `/pricing` now preserve checkout intent through signup/auth and resume Stripe checkout on first authenticated app load. Commit: `24d44d7`.
- ✅ Branded app 404 added at `apps/web/src/app/not-found.tsx`. Commit: `24d44d7`.
- ✅ `CRON_SECRET` added to Vercel Production and production redeployed. Public unauthenticated calls to `/api/cron/check-ins` return 401 as expected. Deployment: `nutrigoal-dyu7rs3oi-jurgen-perners-projects.vercel.app`.
