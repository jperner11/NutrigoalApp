# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Brand

**Meal & Motion** (previously NutrigoalApp / Performance Clinic). Brand constants live in `src/lib/site.ts`. The domain is `mealandmotion.app`.

## Monorepo Structure

Turborepo monorepo at `~/Desktop/Nutrigoal/` with npm workspaces:

- `apps/web/` — Next.js 15 web app (primary, aliased as `NutrigoalApp/`)
- `apps/mobile/` — Expo 55 + React Native mobile app
- `packages/shared/` — Shared types, constants, calculation utilities, and role helpers (`@nutrigoal/shared`)

The symlink `~/Desktop/Nutrigoal/NutrigoalApp/` points to `apps/web/`.

## Commands

```bash
# From monorepo root (~/Desktop/Nutrigoal/)
npm run dev:web          # Next.js dev server (localhost:3000)
npm run build:web        # Production build
npm run lint:web         # ESLint

# From apps/web/
npm run dev              # Same as above, directly
npm run build
npm run lint

# Shared package (packages/shared/) — rebuild after changes
cd packages/shared && npm run build
```

No test framework is configured yet.

## Architecture

**Next.js 15 App Router** with TypeScript 5, React 19, Tailwind CSS v4, and Supabase.

### Route Groups

- `src/app/(public)/` — unauthenticated: login, signup, pricing
- `src/app/(app)/` — authenticated pages behind `useUser()` hook + Sidebar layout
- `src/app/api/` — API routes
- `src/app/auth/callback/route.ts` — OAuth code exchange
- Static public pages: `/faq`, `/privacy`, `/terms`, `/support`, `/health-disclaimer`
- `src/app/invite/accept/` — PT client invite acceptance flow

### Key Authenticated Pages (42 total)

Dashboard, diet (list/detail/new), training (list/detail/new/session), cardio, supplements, water, grocery, progress (overview/photos/measurements), onboarding, settings, reports, generate-plans, AI coaching hub (`/ai/coaching` with tool sub-pages), AI suggest, discover (coach marketplace), leads (coach CRM), clients (list/detail/invite + per-client diet/training/messages/feedback), my-nutritionist (managed client view).

### Supabase Auth (three-layer pattern using `@supabase/ssr`)

- **Client** (`lib/supabase/client.ts`): `createBrowserClient()` for browser use
- **Server** (`lib/supabase/server.ts`): `createServerClient()` with cookie management for Server Components and API routes
- **Admin** (`lib/supabase/admin.ts`): service-role client for privileged operations (invite emails, user management)
- **Middleware** (`lib/supabase/middleware.ts` + `src/middleware.ts`): refreshes session tokens on every request, redirects unauthenticated users to `/login`

The `useUser()` hook (`src/hooks/useUser.ts`) manages client-side auth state, fetches the profile from `user_profiles`, and subscribes to auth changes.

### Shared Package (`@nutrigoal/shared`)

Re-exported by `src/lib/nutrition.ts`, `src/lib/training.ts`, `src/lib/constants.ts`. Contains:
- **Types** (`types.ts`): all database entity types and enums — `UserRole`, `Gender`, `ActivityLevel`, `FitnessGoal`, coach marketplace types (`CoachPublicProfile`, `CoachOffer`, `CoachLead`), PT custom intake types, progress photo/measurement types, and 50+ more
- **Roles** (`roles.ts`): `isTrainerRole()`, `isManagedClientRole()`, `requiresOnboardingQuestionnaire()`, `normalizeRole()`, `getRolePlanLabel()`
- **Nutrition** (`nutrition.ts`): `calculateBMR()`, `calculateTDEE()`, `adjustCaloriesForGoal()`, `calculateMacros()`, `calculateWaterIntake()`, `calculateNutritionTargets()`
- **Training** (`training.ts`): `parseRepRange()`, `calculateSuggestion()`
- **Cardio** (`cardio.ts`): `calculateCardioCalories()` (METs-based)
- **Constants** (`constants.ts`): `PRICING` tiers, `BODY_PARTS`, `EQUIPMENT_TYPES`, `CARDIO_TYPES`, `ACTIVITY_LEVELS`, `FITNESS_GOALS`, `MEAL_TYPES`, and 15+ more constant arrays

After editing files in `packages/shared/`, rebuild it before the web app can pick up changes.

### Feature Gating (`src/lib/tierUtils.ts`)

`canAccess(role, feature)` and `isFeatureLocked(role, feature)` control access to gated features: `supplements`, `cardio`, `ai_suggestions`, `meal_notes`, `meal_alternatives`, `full_meals`, `full_training`, `regenerate`. Plan regeneration has per-tier cooldowns via `checkRegenEligibility()`.

### Roles & Tiers

Six user roles in `user_profiles.role`:
- `free` — AI plan generation once, limited meal/training visibility
- `pro` — full plans, regen 1x/week, cardio, supplements, AI suggestions, 7-day free trial available
- `unlimited` — everything in Pro + unlimited regen
- `personal_trainer` — everything + client management, coach marketplace profile, CRM/leads, custom intake questions (replaces old `nutritionist` role, which normalizes to this)
- `personal_trainer_client` — plans managed by their trainer, no AI access (replaces old `nutritionist_client`)
- `nutritionist` / `nutritionist_client` — legacy aliases that normalize to `personal_trainer` / `personal_trainer_client` via `normalizeRole()`

Paid roles: `pro`, `unlimited`, `personal_trainer`, `personal_trainer_client`. AI roles: `pro`, `unlimited`, `personal_trainer`.

### API Routes

**AI endpoints** (all POST, use OpenAI GPT-4o-mini):
- `/api/ai/suggest` — meal suggestions with usage limit checks
- `/api/ai/generate-meal-plan` — full meal plan generation
- `/api/ai/generate-training-plan` — workout plan generation
- `/api/ai/modify-meal-plan` — modify existing meal plans
- `/api/ai/parse-meal` — parse meal from text description
- `/api/ai/coaching` — AI coaching hub tools (auto-fill from user profile)
- `/api/ai/meal-plan-companion` — companion content for meal plans
- `/api/ai/training-check-in` — training progress check-ins
- `/api/ai/training-overload` — progressive overload suggestions

**Coach marketplace & CRM:**
- `GET/POST /api/coach-profiles` — public coach directory profiles
- `GET/POST /api/coach-leads` — lead capture from marketplace
- `POST /api/coach-leads/[id]/respond` — respond to a lead
- `POST /api/coach-leads/[id]/stage` — update lead CRM stage (new → contacted → consult_booked → won → lost)

**Personal trainer invites:**
- `POST /api/personal-trainer/invites` — create invite (email or magic link)
- `POST /api/personal-trainer/invites/[id]/cancel` — revoke invite
- `POST /api/personal-trainer/invites/[id]/resend` — resend invite
- `GET /api/personal-trainer/invites/token/[token]` — validate invite token
- `POST /api/personal-trainer/invites/token/[token]/respond` — accept/decline

**Stripe billing:**
- `POST /api/stripe/checkout` — create checkout session
- `POST /api/stripe/portal` — create customer portal session
- `POST /api/webhooks/stripe` — subscription event webhook

**Food data** (GET, proxy to Spoonacular API):
- `/api/food/search` — ingredient search
- `/api/food/nutrition` — nutrition data by ingredient ID

**Other:**
- `POST /api/admin/grant-unlimited` — admin endpoint (requires ADMIN_SECRET)
- `POST /api/trial/start` — start 7-day Pro trial
- `GET /auth/callback` — OAuth code exchange

### Database

Supabase PostgreSQL with RLS on all tables. 27 migrations in `supabase/migrations/` covering: initial schema, schedule fields, messaging/feedback, supplements, weight logs, favourite foods, tier gating, nutritionist-client relationships, AI-generated flags, progress photos/measurements, pro trial, personal trainer invites, beta events, support requests, behavioral intake fields, trainer onboarding fields, custom intake questions, and coach marketplace + CRM.

### Key Lib Modules

- `lib/site.ts` — brand name, support email, legal jurisdiction constants
- `lib/stripe.ts` — Stripe client singleton, price ID map (pro, unlimited, nutritionist, personal_trainer)
- `lib/coachMarketplace.ts` — coach slug generation, price formatting, lead stage formatting
- `lib/personalTrainerInvites.ts` — invite token generation, email sending (OTP for existing users, admin invite for new), invite state machine
- `lib/coachingPrompts.ts` — AI coaching prompt builders that auto-fill from user profile data
- `lib/rateLimit.ts` — in-memory rate limiter (beta-grade, resets on restart)
- `lib/grocery.ts`, `lib/reports.ts` — grocery list and reporting utilities

### Key UI Components

- `components/ui/Sidebar.tsx` — main nav, role-based filtering, feature gating badges
- `components/ui/ProGate.tsx` — wraps gated features with upgrade prompts
- `components/brand/BrandLogo.tsx` — Meal & Motion logo component
- `components/marketing/PublicPageShell.tsx`, `PublicFooter.tsx` — public page layout
- `components/dashboard/` — MealPlanTracker, QuickWeightLog, StreaksWidget, SupplementWidget, TodayTrainingPreview
- `components/diet/PlanChat.tsx` — AI-powered meal modification chat

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY, SPOONACULAR_API_KEY
ADMIN_SECRET
```

Stripe vars (not yet in .env.local): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_UNLIMITED`, `STRIPE_PRICE_NUTRITIONIST`, `STRIPE_PRICE_PERSONAL_TRAINER`

### Path Alias

`@/*` maps to `./src/*` (tsconfig.json). The web app imports shared code via `@nutrigoal/shared`. Next config includes `transpilePackages: ['@nutrigoal/shared']`.
