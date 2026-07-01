# Treno — Session Handoff (last updated 2026-06-13)

Working notes so any session can pick up where we left off. Acting brief: Claude as
CTO/CPO/etc. helping Jurgen build out the **coach marketplace** as Treno's main product.

---

## TL;DR — where we are

1. Did a full app review and fixed all the bugs/security issues found (build green).
2. **Committed to the marketplace model** (not the "tool" model) — the core strategic call.
3. Shipped the **trust layer**: real reviews/ratings, real coach photos, honest verification.
4. Built an **agentic E2E testing** setup (AI drives a browser as a fake PT/client).

Production build is GREEN. Shared package rebuilt.

**Two things block progress and are on Jurgen, not code** — see "Pending actions" below.

---

## Strategic direction (the decision that drives everything)

Treno's marketing promised a marketplace ("we send you clients", "payments from one
room") but the code was a flat $24.99/mo SaaS tool with payments entirely off-platform
(no Stripe Connect). We resolved the contradiction by **committing to the marketplace**:
the only defensible wedge vs entrenched tool incumbents (Trainerize/TrueCoach/Everfit),
and a ~12× higher revenue ceiling (% of GMV vs a flat sub).

Build order chosen: **trust layer first** (done) → **Stripe Connect next** → then
transformation galleries, native consult booking, response-time tracking, seat-based
upgrade billing.

---

## Shipped this session

### A. Review/security fixes (earlier) — all complete, build green
AI route auth consolidated into `aiAuth.ts`; tier gating server-side; DB role-protection
trigger (054); signup default → free (055); billing lifecycle + trial expiry cron;
removed coach emails from public endpoints; rate limiting; etc.

### B. Trust layer — complete, build green
- **Reviews & ratings** — migration `057_coach_reviews.sql`
  - `coach_reviews` table; RLS gates reviewing to REAL clients (accepted lead OR
    assigned trainer), enforced in Postgres via `has_coaching_relationship()`.
  - `rating_avg` / `rating_count` denormalized onto `coach_public_profiles` via trigger.
  - API: `src/app/api/coach-reviews/route.ts` (GET list + eligibility; POST upsert own).
  - UI: `components/coach/CoachReviews.tsx`; ratings shown on coach profile, `/discover`,
    and match results.
- **Real coach avatars** — `components/coach/CoachAvatar.tsx`
  - Renders real `avatar_url` photo (was always a fake initials placeholder); fallback to
    initials. Wired into profile, discover, match card. Upload already works in onboarding.
- **Honest verification** — migration `058_coach_verification.sql`
  - Added `coach_verification_status` (+ verified_at, credential fields) to `user_profiles`.
  - The fake "VERIFIED" badge (shown on every profile) now only appears when truly verified.
  - Coaches request via Settings → Marketplace → `POST /api/coach/verification` (sets
    'pending'). Only admin can grant: `POST /api/admin/verify-coach` (ADMIN_SECRET bearer).
  - DB trigger (extends 058) BLOCKS coaches from self-verifying. Type added to
    `@treno/shared` (`CoachVerificationStatus`) — shared package rebuilt.

### C. Agentic E2E testing — complete (`apps/web/e2e/`)
- `lib/seed.ts` + `npm run e2e:seed -w apps/web -- create pt|client|cleanup` — mints
  PRE-CONFIRMED users via Supabase admin API (skips email confirmation).
- `lib/env.ts` — **prod-guard**: refuses to run if pointed at the prod Supabase URL
  (verified working).
- `.mcp.json` (repo root) — registers Playwright MCP so Claude can drive a real browser.
- `e2e/missions/*.md` — natural-language test missions (pt-onboarding, client-onboarding,
  invite-to-review). Read `apps/web/e2e/README.md` for full setup.
- `e2e/` excluded from the Next build (tsconfig) so test tooling never breaks production.

---

## ⚠️ Pending actions (on Jurgen — code is ready)

1. **Apply migrations 057 + 058** to the Supabase project. They are written but NOT yet
   run against the database. Until applied, reviews/verification features will error.
2. **Stand up a test Supabase environment** for E2E (you only have prod). Options in
   `apps/web/e2e/README.md`: local `supabase start`, or a 2nd free hosted project with
   "Confirm email" OFF. Then `cp apps/web/e2e/.env.e2e.example apps/web/.env.e2e` and fill it.
3. To run agent missions: **restart Claude Code once** (loads the Playwright MCP server,
   approve it), then ask: "Run the PT onboarding mission against my test env."

---

## Open decisions / next steps (not yet built)

- **Stripe Connect** — THE next big build. Makes Treno a real marketplace: money flows
  through the platform, enabling a take-rate. (Jurgen leaning yes; not started.)
- **Deterministic Playwright suite + GitHub Action** — CI safety net running these flows
  on every deploy. Offered; awaiting go-ahead (maybe after seeing the agent run once).
- **Settings avatar re-upload** — minor: coaches can only set a photo at onboarding,
  not change it later.
- **Admin verification queue UI** — verification grant is currently a manual admin curl;
  build a UI when volume grows.
- **Transformation/before-after galleries** — cheaper conversion lift; alternative to
  starting Stripe Connect first.

---

## Key file map
- Strategy/roadmap: this file + memory `project_marketplace_strategy.md`
- Reviews: `supabase/migrations/057_*`, `api/coach-reviews/`, `components/coach/CoachReviews.tsx`
- Verification: `supabase/migrations/058_*`, `api/coach/verification/`, `api/admin/verify-coach/`
- Avatars: `components/coach/CoachAvatar.tsx`
- Marketplace surfaces: `app/find-coach/[slug]/page.tsx`, `app/(app)/discover/page.tsx`,
  `components/find-coach/MatchedCoachCard.tsx`, `lib/coachScoring.ts`, `lib/findCoach.ts`
- E2E testing: `apps/web/e2e/` (+ `apps/web/e2e/README.md`), `.mcp.json`
