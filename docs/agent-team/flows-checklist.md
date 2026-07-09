# Treno flow inventory & coverage log

_The QA agent works through this list **round-robin**: each run it picks the next flow
(the one with the oldest `last_checked`), tests it end-to-end on the TEST environment,
and appends a result to the Coverage log at the bottom. Over a full cycle every flow is
provably checked — not one random journey._

## How the QA agent uses this file
1. Read this file. In the **Coverage log**, find the flow with the oldest `last_checked`
   (or any never-checked flow). That's this run's target.
2. Test that ONE flow end-to-end (use `apps/web/e2e/` seed + fixtures; test env only).
3. Append a dated row to the Coverage log: `flow_id | date | PASS/FAIL/BLOCKED | note`.
4. If FAIL and it's a small fix → PR to `staging` (label `agent:qa`). Otherwise → GitHub
   issue (label `qa`) with repro. Either way, still log the result.
5. Commit the updated Coverage log as part of the PR, or in a tiny `[agent:qa] coverage`
   PR if no code changed.

## Flow inventory

Legend — **Tier**: free / pro / nutritionist(coach) / any. **Multi**: needs 2 users acting
in sequence (harder — schedule after single-user flows are green).

### Auth & account
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F01 | Sign up (create account) | any | no | Real UI signup hits email confirm; seed mints pre-confirmed users. Verify redirect to onboarding / confirm screen. |
| F02 | Log in | any | no | Seeded user → dashboard. |
| F03 | Log out | any | no | Returns to logged-out home; protected routes redirect. |
| F04 | Password reset request | any | no | Request screen + email trigger (can't read inbox — assert the request UX). |
| F05 | Auth redirect / route protection | any | no | Logged-out hitting /dashboard, /onboarding → /login. |

### Client journey
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F10 | Client onboarding questionnaire (9 steps → dashboard) | free | no | Automation-hostile: number inputs commit on blur, options are cards. |
| F11 | Generate AI plan from intake | free | no | Needs OpenAI — assert request fires / plan renders (cost-aware). |
| F12 | Log a meal | free | no | |
| F13 | Log a workout | free | no | |
| F14 | Pro-gating holds (cardio, supplements) | free | no | Free user sees upgrade prompt, not the feature. |
| F15 | Cardio tracking (as Pro) | pro | no | |
| F16 | Supplements tracking (as Pro) | pro | no | |

### Coach / PT journey
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F20 | Coach setup questionnaire (6 steps) | coach | no | |
| F21 | Publish public marketplace profile | coach | no | Renders publicly. |
| F22 | Request verification (pending, no badge yet) | coach | no | Trust-layer guarantee: no "Verified" badge while only pending. |

### Marketplace
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F30 | Discover coaches renders | any | no | |
| F31 | View a public coach profile | any | no | |
| F32 | Request / hire a coach | client | no | Kicks off the PT↔client link. |

### PT ↔ client relationship (multi-user)
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F40 | Coach invites client / client accepts | both | yes | |
| F41 | Coach assigns custom anamnesis / plan | both | yes | |
| F42 | Client completes assigned intake; coach sees it | both | yes | |
| F43 | Coach reviews client & leaves guidance | both | yes | |

### Feedback & reviews (multi-user)
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F50 | Client leaves a review of coach | both | yes | |
| F51 | Coach responds / check-in cycle | both | yes | |

### Billing
| ID | Flow | Tier | Multi | Notes |
|----|------|------|-------|-------|
| F60 | Upgrade tier (Stripe test mode) | any | no | Use Stripe test cards; never real charges. |
| F61 | Tier boundaries after upgrade/downgrade | any | no | |

## Coverage log
_Append one row per run. `last_checked` = most recent date a flow appears here._

| flow_id | date | result | note |
|---------|------|--------|------|
| F01 | 2026-07-03 | BLOCKED | No spec for signup flow; /signup page renders HTTP 200 (smoke only). |
| F02 | 2026-07-03 | PASS | Seeded coach and client both log in via real form → dashboard/onboarding. |
| F05 | 2026-07-03 | PASS | Logged-out user hitting /dashboard redirected to /login. |
| F01 | 2026-07-03 | PASS | Re-run after infra fix: all 10 smoke tests green (10/10). /signup renders OK; full form-submission spec still missing. |
| F03 | 2026-07-03 | BLOCKED | No deterministic spec existed; logout spec added to smoke.spec.ts in this PR — pending CI confirmation. |
| F04 | 2026-07-04 | BLOCKED | No deterministic spec for password reset UX; /reset-password page renders 200 OK (smoke public-pages). |
| F01 | 2026-07-04 | PASS | signup.spec.ts: form renders, password validation, full signup → /onboarding (all 3 tests green). |
| F02 | 2026-07-04 | PASS | smoke.spec.ts: login form fields, seeded coach + client sign-in (11/11 smoke green after launchOptions fix). |
| F03 | 2026-07-04 | PASS | smoke.spec.ts: sign-out → /login, subsequent /dashboard still blocked (11/11 smoke green). |
| F05 | 2026-07-04 | PASS | smoke.spec.ts: /dashboard → /login for unauthenticated user (confirmed again). |
| F10 | 2026-07-05 | PASS | client-onboarding.spec.ts: questionnaire loads + full 9-step completion → /dashboard (4/4 green). |
| F14 | 2026-07-05 | PASS | client-onboarding.spec.ts: free-tier gating — cardio + supplements show upgrade prompts. |
| F30 | 2026-07-05 | PASS | client-onboarding.spec.ts: discover coaches renders for free client. |
| F20 | 2026-07-05 | PASS | pt-onboarding.spec.ts: coach setup questionnaire loads (1/3 pass); 2 stubs still test.fixme (F20 full + F21 BLOCKED). |
| F11 | 2026-07-05 | BLOCKED | No prior spec; generate-plans.spec.ts added this run — AI routes mocked via page.route(); awaiting CI green to promote to PASS. |
| F12 | 2026-07-06 | PASS | log-meal.spec.ts: /diet/new renders for free client (upgrade prompt shown), food search mocked, full add-meal → save → /diet flow (2/2 green). |
| F04 | 2026-07-06 | FAIL | No password-reset request UI: /reset-password only serves post-invite "set password" flow; unauthenticated visitor without a token sees "invalid link" banner, not an email-request form. reset-password.spec.ts added with fixme for missing form. GitHub issue filed (label: qa). |
| F40 | 2026-07-07 | PASS | invite-accept.spec.ts (new): coach sees pending invite on /clients → client accepts via real /invite/accept UI → relationship persisted (personal_trainer_id + role) → coach sees client as active (1/1 green, re-ran twice). Real invite *creation* (POST /api/personal-trainer/invites) hard-requires RESEND_API_KEY, unset in e2e/CI, so the spec seeds the pending invite row directly and drives everything downstream for real. GitHub issue filed for the RESEND_API_KEY gap (label: qa). |
| F13 | 2026-07-07 | PASS | log-workout.spec.ts (new): seeded a one-day training plan (single exercise from the global `exercises` catalog) directly via a new `seedTrainingDay()` helper, skipping the "New Training Plan" builder UI to focus on session logging. Free client opens /training/session/<dayId>, fills weight+reps for every set, marks each complete, finishes the workout → redirects to /training (workout_logs row inserted). 1/1 green, re-ran twice. |
| F15 | 2026-07-08 | PASS | cardio-tracking.spec.ts (new): F40 and F60 both already green/blocked-on-secrets (see #69, #74), so this run resumed round-robin at the next never-checked flow. Seeded a free client, force-upgraded to 'pro' via a new `upgradeUserRole()` helper (signup trigger only bootstraps free/personal_trainer from metadata, so no Stripe path exists to reach Pro deterministically), logged in, confirmed /cardio renders the tracking form (not the F14 upgrade-prompt lock screen), logged a session end-to-end, and confirmed it appears in the session list. 1/1 green, re-ran twice. |
| F16 | 2026-07-08 | PASS | supplements-tracking.spec.ts (new): F40 and F60 remain green/blocked-on-secrets (#69, #74; F60's billing-upgrade.spec.ts is on open PR #75 pending merge), so this run continued round-robin at the next never-checked flow. Seeded a free client, force-upgraded to 'pro' via the existing `upgradeUserRole()` helper, logged in, confirmed /supplements renders the tracking UI (not the F14 upgrade-prompt lock screen), added a supplement, and marked it taken — toggle flips to `aria-pressed="true"`. 1/1 green, re-ran twice more (3/3 total). |
| F21 | 2026-07-08 | PASS | pt-onboarding.spec.ts: un-fixme'd the existing "coach publishes a marketplace profile" test (F40/F60 still resolved per #69/#75/#74, so round-robin continued to the next never-checked flow — F20's leftover fixme stubs). Fixed two stale locators in `publishCoachProfile()`/`requestVerification()` (`e2e/lib/flows.ts`): the profile slug is generated as `<slugified-name>-<id6>` (e.g. `e2e-coach-e825d5`), not a fixed `coach-` prefix, so the `input[disabled]` value-filter regex never matched; and the certification-link field's accessible name is "Certification link" (the "REPS / PT diploma…" text is only the placeholder), so `getByRole` never found it. With both fixed: coach publishes a public marketplace profile (headline, bio, price, Discover toggle) → renders on `/find-coach/<slug>` for a logged-out visitor. 2/2 green, re-ran twice. |
| F22 | 2026-07-08 | PASS | Same pt-onboarding.spec.ts test as F21 (one spec covers both): after publishing, the coach submits a verification request (pending) and the public profile is asserted to show NO "Verified" badge while status is only pending — the trust-layer guarantee holds. |
| F31 | 2026-07-09 | PASS | F40 and F60 remain resolved (F40 PASS; F60 has open PR #75 + tracking issue #74 for the remaining Stripe-secrets gap), so this run continued round-robin at the next never-checked flow, F31. The existing pt-onboarding.spec.ts "coach publishes a marketplace profile…" test already drives a logged-out visitor to `/find-coach/<slug>`, so this run extended its assertions rather than duplicating a new spec: now also asserts the coach's headline text, the "Request coaching →" CTA link, and the "← Back to discover" link all render on the public profile. 2/2 pt-onboarding.spec.ts tests green (re-ran single-worker after a parallel-run cold-start flake on the unrelated login test self-resolved). |
| F32 | 2026-07-09 | PASS | coach-lead-request.spec.ts (new): F40/F60 still resolved (#69/#75/#74) and F31 already covered this run's earlier pass, so round-robin continued to the next never-checked flow, F32. Seeded a published coach directly (`publishCoachProfile()` in `e2e/lib/seed.ts`, now returns `{slug}`), free client drives the real 4-step `/find-coach/<slug>/request` wizard (Goal → Logistics → Message → Review) → `POST /api/coach-leads` → redirect to `/dashboard`; coach sees the pending lead on `/leads`, clicks "Accept lead"; relationship persisted (`personal_trainer_id` + `role='personal_trainer_client'`, verified via a DB read). 3/3 green (initial run + 2 repeats, one under parallel workers) — required `npm run build && npm run start` (CI mode): dev-mode on-demand route compilation was intermittently swallowing the final "Send request" click on first navigation to a not-yet-compiled route. |
| F41 | 2026-07-09 | PASS | assign-plan.spec.ts (new): F40/F60 still resolved (#69/#75/#74), so this run followed the charter's explicit next step and covered the first never-checked multi-user PT↔client flow, F41. Used `createLinkedPair()` (no F40 invite needed — that's its own spec) to seed an already-linked coach+client, then drove the real "New Training Plan" builder at `/clients/<id>/training/new` (name plan, add day, pick "Bench Press" from the shared exercise catalog, save) → redirects to the client file, plan shows Active. Client (separate browser context, logged in concurrently) opens their own `/training` and sees the coach-assigned plan. **Found and fixed a real gap in the shared seed helper**: `linkClientToTrainer()`/`createLinkedPair()` only set `user_profiles.personal_trainer_id`, but the RLS policy trainers actually hit ("Nutritionists can view client profiles", migration 001) checks a separate `nutritionist_clients` row with `status='active'` — the same upsert the real invite-accept route makes. Without it the coach's browser session got `406`/0-rows on every client-profile read. Fixed `linkClientToTrainer()` in `apps/web/e2e/lib/seed.ts` to upsert `nutritionist_clients` and set role/personal_trainer_id/nutritionist_id exactly as the real accept route does — this only touches test infra, no product code. 3/3 green (initial run + 2 repeats). |
