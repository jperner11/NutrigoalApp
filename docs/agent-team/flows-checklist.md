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
| F01 | 2026-07-02 | BLOCKED | No deterministic spec for full signup flow; /signup page renders OK (200) |
| F02 | 2026-07-02 | FAIL | Browser signInWithPassword() never resolves (isLoading stuck true); Node.js auth works fine — see #20 |
| F05 | 2026-07-02 | PASS | /dashboard redirects unauthenticated visitor to /login |
| F30 | 2026-07-02 | PASS | /find-coach page renders OK (200) |
