# UX Findings — Client signup → onboarding → plans → free tier

**Date:** 2026-07-09 · **Mission:** `e2e/missions/client-onboarding.md` · **Run by:** Claude (local, test Supabase)
**Persona:** "Maya Silva" — 31F, 165cm/68kg, lose weight (→62kg / 12 weeks), desk job, lightly active,
peanut allergy, dislikes liver/blue cheese, meal-prep, knee pain, beginner (1y), full gym, evening training.
**Viewport:** iPhone-class (393×852) — the device most testers will actually use.

## Verdict (short)

The onboarding is genuinely good — best-in-class pacing, warm copy, honest time expectation,
and each step explains *why* it asks. A real user would finish it. But the **review step has two
visible rendering bugs** and one **nutrition-logic question** that a coach-y tester would spot
immediately. Fix those before invites; everything else below is polish.

## Bugs (fix before testers)

1. **Review step (9/9): overlapping text in the profile summary.** The "desired outcome" value
   renders as two text layers colliding ("comfortable in my clothes…" overprints itself) at
   mobile width. Looks broken at the exact moment the app is trying to look smart.
2. **Review step: raw `&apos;` entities in the AI-coach note.** "everything you&apos;ve told us…
   unless that&apos;s what you asked for" — double-escaped apostrophes rendered literally.
3. **Nutrition targets: fat = 32g (0.47 g/kg) for a 68kg woman on a cut.** Protein 150g (2.2 g/kg)
   + 1418 kcal squeezes fat below the ~0.6–0.8 g/kg floor most coaches keep for hormonal health.
   Worth a review of the macro allocation logic (protein could be ~130g, fat ~45–50g).

## Friction (worth fixing soon)

4. **Name asked twice.** Signup collects "First name"; onboarding step 1 asks "Full Name" again,
   empty. Pre-fill it from the signup value.
5. **Homepage beta chip crowding (mobile).** "OPEN BETA — SPRING 2026" chip and "EST. 2024 · BR/UK"
   collide visually at 393px.
6. **Step 2 "Remote — work from home" as a job type** overlaps conceptually with "Desk Job" —
   users who WFH at a desk won't know which to pick. Consider "Remote (desk)" or merging.

## What's genuinely good (keep)

- "This questionnaire takes about 5–10 minutes" expectation-setting up front.
- Every step opens with *why* it's asked ("This helps us avoid exercises… that could cause problems").
- Goal-weight copy: "Leave this blank if you care more about how you want to look, feel, or perform."
- Quick-add chips for food dislikes; free-text allergy field; injury chips with skip.
- Generation screen shows real progress ("Generated your training plan → Generating day 1 of 7…").
- 9-step progress bar always visible; Back works everywhere.

## Post-onboarding (AI plans, gating, discover)

**AI plan generation: the strongest part of the product.** ~3 minutes with honest, step-by-step
progress ("Generated your training plan → Generating day 3 of 7…"). The result: 7 named days,
per-day kcal locked to target (1418, 1420, …). **The peanut allergy held end-to-end** — a full-text
scan of the generated week found zero peanut/satay/groundnut mentions and none of Maya's
disliked foods (liver, blue cheese). This is the allergen-safety work (staging `a4cf9e4`) verified
against a live, real-OpenAI generation.

7. **Bug: "Go to Dashboard" on the plans-ready screen renders washed-out** (white-on-white,
   looks disabled) even though it works.
8. **Contradiction: the plans-ready screen advertises "Supplement Recommendations — added to
   your Supplements tab", but that tab is Pro-locked for the free user who just onboarded.**
   Promising something and paywalling it 30 seconds later is the one genuinely sour "upgrade
   moment". Either show the recommendations read-only with upgrade-to-track, or don't list the
   card for free users.

**Tier gating: holds.** /cardio and /supplements both show upgrade prompts, no leaks; PRO badges
in the nav set expectations. The new "Send feedback" sidebar entry is live and discoverable.

**Discover (buyer's eyes):** search + format filter work; cards show pricing/check-ins/location
cleanly. But:

9. **⚠️ PROD HAS ZERO PUBLIC COACHES** (`coach_public_profiles`: 0 rows public). A client tester
   tapping "Find a coach" (homepage CTA) or "Discover Coaches" on production sees an empty
   marketplace — the app's core pitch, empty, on first contact. Before client invites: either seed
   2–3 real founding-coach profiles (Jurgen + friendly PTs) or soft-hide Discover behind a
   "Marketplace opening soon" state for the beta.

## Suggested fix order

1. #9 empty prod marketplace (strategic, before any invite)
2. #1/#2 review-step rendering bugs (worst visual moment)
3. #8 supplements promise-then-paywall
4. #3 fat-floor macro review (nutrition credibility)
5. #4–#7 polish

