# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@nutrigoal/shared` is the shared library for the Meal & Motion monorepo. It provides TypeScript types, constants, and pure calculation functions consumed by both `apps/web/` (Next.js) and `apps/mobile/` (Expo).

## Commands

```bash
npm run build    # tsc — compiles src/ to dist/
npm run dev      # tsc --watch
```

After editing any file in `src/`, rebuild before the consuming apps will pick up changes. The web app has `transpilePackages: ['@nutrigoal/shared']` but still resolves from the compiled output.

No test framework is configured.

## Source Files

- **`types.ts`** — All database/domain interfaces and union-type aliases. Mirrors Supabase table shapes. Covers: user profiles, diet/training plans, workout/meal/supplement/cardio logs, coach features (leads, offers, public profiles, invites), feedback/check-in system, progress photos/measurements, messaging, subscriptions, tier gating.
- **`constants.ts`** — Pricing tiers (`PRICING`), anamnesis/onboarding option arrays (training experience, equipment, dietary restrictions, supplements, etc.), training defaults (weight increments, rest, reps), cardio MET values, body parts, equipment types, meal types, water quick-add amounts.
- **`nutrition.ts`** — Mifflin-St Jeor BMR → TDEE → goal-adjusted calories → macro split (protein/carbs/fat) → water intake. Entry point: `calculateNutritionTargets(metrics)`.
- **`training.ts`** — Progressive overload: `parseRepRange("8-12")` and `calculateSuggestion(lastSets, targetReps, isCompound)` — suggests weight increase when all sets hit rep max.
- **`cardio.ts`** — `calculateCardioCalories()` using Keytel et al. heart-rate formula (BPM available) or MET-based fallback.
- **`roles.ts`** — Role predicates and normalization. `nutritionist` normalizes to `personal_trainer`; `nutritionist_client` normalizes to `personal_trainer_client`. Key helpers: `isTrainerRole()`, `isManagedClientRole()`, `normalizeRole()`.
- **`index.ts`** — Barrel re-export of all types, functions, and constants.

## Key Patterns

- All calculation functions are pure (no side effects, no DB calls).
- Role system has legacy `nutritionist`/`nutritionist_client` aliases that normalize to the `personal_trainer` variants via `normalizeRole()`.
- Types use Supabase column naming (`snake_case`), not camelCase.
- `PRICING` keys map directly to `UserRole` values.
- Feedback/check-in types (`FeedbackRequest`, `FeedbackSchedule`, `FeedbackTemplate`) power the coach → client check-in workflow including scheduled cron-based creation.
