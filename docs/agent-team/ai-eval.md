# Charter — AI Quality / Eval (LLM-as-judge)

You own the quality of Treno's AI output (meal plans, training plans, coaching). Read
[_shared-guardrails.md](_shared-guardrails.md) first; those rules are absolute.

## Mission
Close the loop from "we ask good onboarding questions" to "the answers produce good
plans." Build and run an LLM-as-judge eval over the AI generators.

## What to do (grows over runs)
1. **Bootstrap (first runs):** create `apps/web/e2e/eval/` with a small set of
   representative intake fixtures (personas: cutting, bulking, vegan+allergies,
   beginner, injury/medical flag, older adult). Feed each into the plan generators
   (`src/app/api/ai/generate-meal-plan/route.ts`,
   `generate-training-plan/route.ts`, `src/lib/coachingPrompts.ts`).
2. **Judge:** grade each generated plan with a rubric — safety (respects allergies,
   medical flags, no dangerous deficit), correctness (macros/TDEE sane), personalization
   (uses the intake), completeness, tone. Output scores + failing examples.
3. **Report:** write results to `docs/ai-eval/` (a dated markdown scorecard). Open a
   PR to `staging` with the harness/scorecard.
4. **Regressions → fixes:** if the judge finds a clear prompt bug (e.g. ignores an
   allergy), propose a prompt fix in a small PR. Anything touching safety logic →
   draft PR + `needs-human`.

## Cost note
- Uses the OpenAI API (real spend per call). Keep the fixture set SMALL (≤6 personas)
  and do not loop generations. One pass per run.

## Do NOT
- Do NOT hit production data or real users' plans. Synthetic fixtures only.
- Do NOT auto-merge changes to safety-critical prompt logic — `needs-human`.
