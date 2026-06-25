# Onboarding questionnaire — content audit & rewrite

_Last updated 2026-06-24. Reviews the client anamnesis (9 steps) and coach setup (6 steps)
questionnaires for usefulness: is each question wired to a real consumer, and are the
right questions being asked for an AI-plan + coach-marketplace product?_

## Method

Traced every collected field to its consumer by reading the code, not guessing:
- AI consumers: `src/lib/coachingPrompts.ts`, `src/app/api/ai/generate-meal-plan/route.ts`,
  `src/app/api/ai/generate-training-plan/route.ts`, and the client-side hub that maps the
  saved profile into the AI request: `src/app/(app)/generate-plans/page.tsx`.
- Coach/match consumers: `src/lib/coachScoring.ts`, `src/lib/findCoach.ts`, the coach's
  client view `src/app/(app)/clients/[id]/page.tsx`.

## Headline

**The questionnaire is unusually well-wired.** Almost every collected field feeds the AI
plan, the coach's client view, or matching. The problem is not wasted questions — it's a
few *missing* questions (safety, goal rate, coach credentials) and *disproportion* (length).

## What's used (field → consumer)

| Field group | Consumer |
|---|---|
| age, weight, height, gender, activity, goal, target_weight, goal_timeline, meals_per_day, body_fat_pct | TDEE/macro math → meal + training plan |
| dietary restrictions, allergies, food dislikes/favourites | meal-plan prompt (explicit allergy-safety language) |
| past plan challenges, derailers, motivation, snack profile, eat-out frequency | meal-plan prompt (the behavioral edge — genuinely used) |
| medical conditions, medications, alcohol (+ frequency/details) | meal-plan prompt (safety + accuracy) |
| sleep hours/quality, stress, water, cardio, lifts (squat/bench/deadlift), years training, secondary goal | training prompt + coach client view + coaching AI |

## Dead questions (collected, used nowhere)

- **`bed_time`** — "What time do you go to bed?" Only `wake_time` is ever read. **Cut it**, or
  wire it into sleep-window / meal-timing logic.

(That was the only field with zero consumers across `src/`.)

## The real opportunities

### Client questionnaire
1. **Add red-flag medical screening** (safety/liability gap for an app that auto-generates
   calorie deficits and training loads): pregnancy/breastfeeding, eating-disorder history,
   cardiac/blood-pressure conditions, recent surgery. Today only free-text "medical
   conditions / medications" is captured.
2. **Quantify the goal rate.** target_weight + timeline are collected, but not a *realistic
   rate* (e.g. 0.5 kg/week). The AI needs it to set a sensible deficit/surplus.
3. **Trim the Snack Habits step.** It's a full 5-question step (sweet/savoury, late-night,
   what, why, motivation) when snacking is one habit. Reduce to 1–2; reinvest the space in
   current-diet depth (typical day of eating, cooking ability/time, budget) which matters
   more for meal-plan quality.
4. **Cut `bed_time`** (above).

### Coach questionnaire
1. **Capture credentials/experience** for marketplace trust + matching: certification type,
   years coaching, niche/specialization, notable results. Verification exists separately, but
   intake should feed it.
2. Consider surfacing **pricing & capacity** in onboarding (currently Settings-only) since
   they're core marketplace positioning signals.

## Suggested client step order (shorter, safety-first)

1. Stats (age, weight, height, gender, body fat) + **goal & realistic rate**
2. **Health & safety screen** (red flags, conditions, meds, injuries) — early, gates the plan
3. Food (typical day, restrictions/allergies, dislikes/favourites, cooking time/budget)
4. Training (experience, lifts, cardio, session length, schedule)
5. Lifestyle (sleep, stress, alcohol, water)
6. Adherence (past challenges, derailers, motivation) ← keep, it's your edge
7. Review

## Not waste, but worth verifying next

An **LLM-as-judge** check: feed a sample intake into the plan generator and grade whether the
output is sensible. That closes the loop from "we ask good questions" to "the answers produce
good plans."
