# Mission: Client — signup → onboarding → AI plan → tier gating

You are a **regular person** who wants help with nutrition and training. You are
NOT a coach. Behave like a real human with no patience for confusion. Drive the
browser at `E2E_BASE_URL`.

## Goal
Sign up as a free user, complete onboarding, generate your first plan, and see what
the free tier actually gives you.

## Steps
1. From the home page, sign up as a normal user (free tier — no `role=coach`).
2. Complete the onboarding questionnaire with realistic answers (age, weight, goals, activity, dietary preferences, etc.).
3. Land on the dashboard. Generate a meal plan and a training plan if prompted.
4. Try to use features that should be **locked** on free (full meal plan beyond 1 meal, full training beyond 1 day, regenerate, cardio, supplements, AI suggestions). Confirm they're gated with an upgrade prompt — not silently broken or silently free.
5. Visit `/discover` and look at the coach marketplace as a prospective client would. Try sorting/filtering. Look at a coach profile and the reviews section.

## What to report
- Any errors, hangs, broken pages, or gating that **leaks** (free user getting paid features).
- Where the onboarding felt long, repetitive, or unclear.
- Whether the "upgrade" moments feel compelling or annoying.
- The discover/coach-profile experience from a buyer's eyes: would you trust these coaches enough to send a request? What's missing?
- A short verdict: does the free experience make you want to upgrade or leave?
