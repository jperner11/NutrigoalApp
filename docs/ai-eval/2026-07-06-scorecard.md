# AI Eval Scorecard — 2026-07-06 (allergen-safety fix verification)

**Run by:** Claude (interactive session with Jurgen), fixing the 2026-07-05 FAIL
**Harness:** `apps/web/e2e/eval/run-eval.mjs` | **Models:** gpt-4o-mini (gen + judge)
**Pass thresholds:** per-dimension ≥ 3, weighted average ≥ 3.5

## Summary

| Persona | Safety | Correctness | Personalization | Completeness | Tone | Weighted Avg | Result |
|---|---|---|---|---|---|---|---|
| Cutting — 28yo male | 5 | 4 | 4 | 4 | 5 | **4.4** | ✅ PASS |
| Vegan + nut allergy — 35yo female | 5 | 3 | 4 | 4 | 4 | **4.2** | ✅ PASS |
| Injury + medical — 55yo male | 4 | 3 | 4 | 4 | 4 | **3.7** | ✅ PASS |

**Overall: 3/3 pass — first suite-level PASS.** (2026-07-05: vegan persona FAILED at 3.2.)

## What changed (the fix for the 2026-07-05 safety FAIL)

New shared module **`src/lib/allergenSafety.mjs`** — single source of truth imported by
BOTH the production route (`api/ai/generate-meal-plan/route.ts`) and this harness, so
the eval now tests the real prompt (previously the harness mirrored a stale copy):

1. **Ingredient-level allergen enumeration** in the prompt (`buildAllergenBlock`) —
   "tree nuts" now expands to almonds/walnuts/cashews/… with an explicit rule that
   prohibitions cover alternatives and notes-swaps too.
2. **Protein-first strategy block** (`buildSafeProteinHint`) for restrictive combos —
   allowed-source list filtered against allergies+dislikes, per-meal protein minimum,
   worked example, protein-powder guidance. Protein deficit went 50g → ~10–28g.
3. **Allergen-aware reference data** — the base prompt no longer suggests nuts/peanut
   butter/whole milk to allergic or vegan clients (`buildReferenceData`,
   `buildCalorieDenseList`).
4. **Programmatic post-generation scan** (`findAllergenViolations`) — word-boundary
   matching with phrase exceptions (coconut milk ≠ dairy, gluten-free oats ≠ gluten),
   covering allergies AND vegan/vegetarian/gluten-free restrictions. The production
   route now blocks violating plans with a 422 + Sentry event instead of serving them.
   The harness treats any scan hit as an automatic FAIL.
5. **Judge grounding** — the harness's old `includes('milk')`-style pre-scan fed the
   judge false "possible animal product" evidence (it flagged coconut milk and
   gluten-free oats); replaced with the shared exception-aware scan. This false signal
   is what made run-to-run scores noisy.

## Remaining known gap (tracked, not blocking)

gpt-4o-mini single-pass macro arithmetic still drifts (vegan run: ~28g protein under,
~300 kcal over before post-processing). The route's proportional calorie scaling
corrects calories; protein composition is prompt-steered only. If future runs dip
below threshold on correctness, consider a composition-aware retry or a stronger
generation model for restrictive personas.
