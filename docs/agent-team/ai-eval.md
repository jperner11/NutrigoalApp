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
4. **Escalate suite FAILs (do not just write the scorecard):** if any persona fails
   the rubric, file a GitHub issue titled
   `[ai-eval] SAFETY: <persona> failed <date> eval`, with labels `safety` +
   `needs-human` (create the labels if missing). Link the scorecard, name the failing
   dimensions, and quote the worst output. First check for an existing OPEN `safety`
   issue for the same persona/failure — update that one instead of duplicating. A
   scorecard nobody reads is not a safety net; the issue is what reaches the founder.
5. **Regressions → fixes:** if the judge finds a clear prompt bug (e.g. ignores an
   allergy), propose a prompt fix in a small PR. Anything touching safety logic →
   draft PR + `needs-human`.

## Cost note — BUDGET IS TIGHT, minimize spend
- The OpenAI key has a small balance. Treat every call as real money.
- Use **at most 3 personas** per run (e.g. cutting, vegan+allergies, injury/medical
  flag) — enough signal, a third of the cost. Do not add more.
- **Judge with the cheapest capable model** (e.g. `gpt-4o-mini` / `gpt-5-mini`-class),
  NOT a frontier model. The judge only needs to score against a rubric.
- One pass per run. No loops, no retries-for-quality, no re-generation.
- If the OpenAI call returns an auth/quota/billing error, STOP immediately, write a
  one-line note in the scorecard, and open no PR — do not burn balance retrying.

## Do NOT
- Do NOT hit production data or real users' plans. Synthetic fixtures only.
- Do NOT auto-merge changes to safety-critical prompt logic — `needs-human`.
