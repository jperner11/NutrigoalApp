/**
 * Allergen safety for AI meal-plan generation — single source of truth shared by
 * the production route (src/app/api/ai/generate-meal-plan/route.ts) and the eval
 * harness (e2e/eval/run-eval.mjs), so the eval always tests the real prompt.
 *
 * Plain ESM with no dependencies so both `node` (harness) and Next.js (route,
 * via allowJs) can import it.
 *
 * Three jobs:
 *  1. expandAllergens()      — user-entered allergy → ingredient-level terms
 *  2. buildAllergenBlock() / buildSafeProteinHint() / filterCalorieDense…()
 *                            — prompt fragments that enumerate prohibitions and
 *                              steer the model toward safe alternatives
 *  3. findAllergenViolations() — programmatic post-generation scan, the safety
 *                              net that does NOT depend on model compliance
 */

// Allergy family → ingredient-level terms the model (and the scanner) must treat
// as prohibited. Keys are matched as substrings of the user's allergy text.
// Scanner terms match on word boundaries, so 'nut' flags "mixed nuts"/"nut butter"
// but not butternut squash, nutmeg, or coconut.
const ALLERGEN_FAMILIES = [
  {
    keys: ['peanut'],
    label: 'peanuts',
    terms: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', 'satay', 'groundnut'],
  },
  {
    keys: ['tree nut', 'nut'],
    label: 'tree nuts',
    terms: [
      'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pistachio',
      'pistachios', 'pecan', 'pecans', 'hazelnut', 'hazelnuts', 'brazil nut',
      'macadamia', 'pine nut', 'pine nuts', 'nut', 'nuts', 'nut butter', 'praline',
      'marzipan', 'nutella',
    ],
  },
  {
    keys: ['dairy', 'milk', 'lactose'],
    label: 'dairy',
    terms: [
      'milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'whey', 'casein',
      'kefir', 'ghee', 'quark', 'mozzarella', 'cheddar', 'parmesan', 'feta',
      'cottage cheese', 'ice cream',
    ],
  },
  {
    keys: ['gluten', 'wheat', 'celiac', 'coeliac'],
    label: 'gluten',
    terms: [
      'wheat', 'bread', 'pasta', 'flour', 'barley', 'rye', 'couscous', 'bulgur',
      'seitan', 'soy sauce', 'noodles', 'tortilla', 'wrap', 'pita', 'cracker',
      'crackers', 'oats', 'beer', 'semolina', 'spelt', 'farro',
    ],
  },
  {
    keys: ['soy', 'soya'],
    label: 'soy',
    terms: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'soy sauce', 'tamari', 'miso'],
  },
  {
    keys: ['egg'],
    label: 'eggs',
    terms: ['egg', 'eggs', 'mayonnaise', 'mayo', 'aioli', 'meringue', 'frittata', 'omelette', 'omelet'],
  },
  {
    keys: ['fish'],
    label: 'fish',
    terms: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'anchovies', 'sardine', 'sardines', 'mackerel', 'trout', 'fish sauce', 'fish oil'],
  },
  {
    keys: ['shellfish', 'crustacean', 'prawn', 'shrimp'],
    label: 'shellfish',
    terms: ['shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'scallop', 'scallops', 'mussel', 'mussels', 'clam', 'clams', 'oyster', 'oysters', 'squid', 'calamari'],
  },
  {
    keys: ['sesame'],
    label: 'sesame',
    terms: ['sesame', 'tahini', 'hummus', 'halva'],
  },
]

// Terms that are innocent in specific phrasings — checked before flagging a
// violation so "coconut milk" (vegan) or "gluten-free oats" (celiac-safe) don't
// produce false positives, in the scanner or in the eval judge's evidence.
const TERM_EXCEPTIONS = {
  milk: /\b(coconut|oat|soy|soya|rice|pea|hemp|plant)([- ]based)?[- ]milk\b/i,
  butter: /\b(peanut|seed|sunflower|soy|cocoa|apple)[- ]?butter\b/i,
  cream: /\bcoconut[- ]cream\b/i,
  oats: /gluten[- ]free/i,
  bread: /gluten[- ]free/i,
  pasta: /gluten[- ]free/i,
  flour: /\b(gluten[- ]free|chickpea|almond|coconut|rice|buckwheat)[- ]flour\b|gluten[- ]free/i,
  wrap: /gluten[- ]free|lettuce[- ]wrap/i,
  tortilla: /gluten[- ]free|corn[- ]tortilla/i,
  noodles: /gluten[- ]free|rice[- ]noodles/i,
  crackers: /gluten[- ]free/i,
  'soy sauce': /gluten[- ]free|tamari/i,
}

// Dietary restrictions expand to prohibited terms too (vegan is a hard product
// constraint even though it isn't an allergy). Gluten-free reuses the gluten
// family from ALLERGEN_FAMILIES.
const RESTRICTION_FAMILIES = [
  {
    keys: ['vegan'],
    label: 'vegan (no animal products)',
    terms: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'ham', 'steak', 'mince',
      'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'prawns', 'anchovy',
      'egg', 'eggs', 'honey', 'gelatin', 'milk', 'cheese', 'butter', 'yogurt',
      'yoghurt', 'cream', 'whey', 'casein', 'ghee',
    ],
  },
  {
    keys: ['vegetarian'],
    label: 'vegetarian (no meat or fish)',
    terms: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'ham', 'steak', 'mince',
      'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'prawns', 'anchovy', 'gelatin',
    ],
  },
  {
    keys: ['gluten-free', 'gluten free'],
    label: 'gluten-free',
    terms: [], // resolved from the gluten allergen family below
  },
]

/** Flat prohibited-term list implied by dietary restrictions. */
export function restrictionTerms(dietaryRestrictions = []) {
  const out = new Set()
  for (const raw of dietaryRestrictions) {
    const d = String(raw).toLowerCase()
    for (const fam of RESTRICTION_FAMILIES) {
      if (fam.keys.some((k) => d.includes(k))) {
        const terms = fam.label === 'gluten-free'
          ? ALLERGEN_FAMILIES.find((f) => f.label === 'gluten').terms
          : fam.terms
        for (const t of terms) out.add(t)
      }
    }
  }
  return [...out]
}

/**
 * Expand user-entered allergies into ingredient-level prohibited terms.
 * Unrecognised allergies are kept verbatim so they still reach the prompt + scan.
 * Returns { label → terms[] } preserving which family each came from.
 */
export function expandAllergens(allergies) {
  const expanded = new Map()
  for (const raw of allergies) {
    const a = String(raw).toLowerCase().trim()
    if (!a) continue
    let matched = false
    for (const fam of ALLERGEN_FAMILIES) {
      if (fam.keys.some((k) => a.includes(k))) {
        expanded.set(fam.label, fam.terms)
        matched = true
      }
    }
    if (!matched) expanded.set(a, [a])
  }
  return expanded
}

/** Flat, deduped term list for scanning / filtering. */
export function allergenTerms(allergies) {
  const out = new Set()
  for (const terms of expandAllergens(allergies).values()) {
    for (const t of terms) out.add(t)
  }
  return [...out]
}

/**
 * Prompt block: enumerated, ingredient-level prohibitions. Replaces the old
 * single-line "ALLERGIES (DANGEROUS — MUST AVOID): tree nuts" which left the
 * model to work out what counts as a tree nut.
 */
export function buildAllergenBlock(allergies) {
  if (!allergies || allergies.length === 0) return ''
  const expanded = expandAllergens(allergies)
  const lines = [...expanded.entries()].map(
    ([label, terms]) => `  * ${label.toUpperCase()} — prohibited ingredients include: ${terms.join(', ')}`,
  )
  return [
    `ALLERGIES (LIFE-THREATENING — ZERO TOLERANCE): ${allergies.join(', ')}.`,
    ...lines,
    '  * These prohibitions apply to EVERY ingredient, EVERY "alternatives" substitution, and every swap suggested in "notes". Do not use them in any form (whole, butter, oil, flour, milk, sauce).',
    '  * If unsure whether an ingredient contains an allergen, choose a different ingredient.',
  ].join('\n')
}

// High-protein sources by suitability, used to steer restrictive combos.
const PLANT_PROTEIN_SOURCES = [
  'red lentils (cooked 100g = 116cal/9P)',
  'chickpeas (cooked 100g = 164cal/9P)',
  'black beans (cooked 100g = 132cal/9P)',
  'edamame (100g = 121cal/12P)',
  'tofu (firm, 100g = 144cal/17P)',
  'tempeh (100g = 192cal/20P)',
  'hemp seeds (30g = 166cal/9P)',
  'pumpkin seeds (30g = 158cal/9P)',
  'sunflower seed butter (30g = 185cal/6P)',
  'pea protein powder (30g scoop = 110cal/24P)',
  'quinoa (cooked 100g = 120cal/4.4P, gluten-free)',
  'buckwheat (cooked 100g = 92cal/3.4P, gluten-free)',
  'nutritional yeast (15g = 60cal/8P)',
]

/**
 * When the diet is plant-based (or the allergy set knocks out the default
 * protein playbook), tell the model exactly which safe high-protein sources
 * remain instead of letting it guess — the 2026-07-05 eval showed it undershoots
 * protein badly on vegan + nut-free + gluten-free otherwise.
 */
export function buildSafeProteinHint({ dietaryRestrictions = [], allergies = [], foodDislikes = [], protein, mealsPerDay = 3 }) {
  const diets = dietaryRestrictions.map((d) => String(d).toLowerCase())
  const plantBased = diets.some((d) => d.includes('vegan') || d.includes('vegetarian'))
  if (!plantBased && allergies.length === 0) return ''

  const banned = allergenTerms(allergies)
  const dislikes = foodDislikes.map((d) => String(d).toLowerCase())
  const safe = PLANT_PROTEIN_SOURCES.filter((src) => {
    const s = src.toLowerCase()
    return !conflictsWith(s, banned) && !dislikes.some((d) => d && s.includes(d))
  })
  if (!plantBased || safe.length === 0) return ''

  const perMeal = Math.ceil(protein / mealsPerDay)
  return [
    `PROTEIN STRATEGY (CRITICAL — the 2nd most common failure on plans like this one):`,
    `This client's restrictions make ${protein}g protein genuinely hard. PLAN PROTEIN FIRST:`,
    `  * Pick each meal's protein source(s) BEFORE carbs and fats. Every meal needs ~${perMeal}g protein minimum — a plan that leaves protein short is a FAILED plan.`,
    `  * ALLOWED high-protein sources for this client (use these heavily, with large portions):`,
    ...safe.map((s) => `      - ${s}`),
    `  * Protein powder is a legitimate tool: a smoothie or porridge with 1-2 scoops (24-48g protein) is usually REQUIRED to reach ${protein}g under these restrictions — include one.`,
    `  * Worked example of ${protein}g-scale day: 2 scoops pea protein (48P) + 250g cooked lentils (22P) + 150g tempeh (30P) + 40g hemp seeds (12P) + 100g quinoa & vegetables (~8P) ≈ 120P — scale portions up from there.`,
    `  * After drafting, SUM the protein of every ingredient. If below ${protein - 5}g, increase portions or add a protein source and re-check.`,
  ].join('\n')
}

// Reference nutrition lines from the base prompt, tagged so allergen-conflicting
// entries can be dropped instead of teaching the model to use them.
const REFERENCE_FOODS = [
  'chicken breast 100g=165cal/31P/0C/3.6F',
  'rice(cooked) 100g=130cal/2.7P/28C/0.3F',
  'oats 100g=389cal/13P/66C/7F',
  'eggs 50g=78cal/6P/0.6C/5F',
  'olive oil 15ml=120cal/0P/0C/14F',
  'banana 120g=107cal/1.3P/27C/0.4F',
  'salmon 100g=208cal/20P/0C/13F',
  'sweet potato 100g=86cal/1.6P/20C/0.1F',
  'peanut butter 30g=188cal/7P/6C/16F',
  'whole milk 250ml=150cal/8P/12C/8F',
  'almonds 30g=173cal/6P/6C/15F',
  'lentils(cooked) 100g=116cal/9P/20C/0.4F',
  'tofu(firm) 100g=144cal/17P/3C/9F',
  'quinoa(cooked) 100g=120cal/4.4P/21C/1.9F',
]

const CALORIE_DENSE = ['nuts', 'olive oil', 'avocado', 'whole milk', 'seeds', 'hummus', 'dried fruit']

function conflictsWith(text, bannedTerms) {
  const t = text.toLowerCase()
  return bannedTerms.some((b) => {
    if (!new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t)) return false
    const exception = TERM_EXCEPTIONS[b.toLowerCase()]
    return !(exception && exception.test(t))
  })
}

/** Reference-data line with allergen- and diet-conflicting foods removed. */
export function buildReferenceData(allergies = [], dietaryRestrictions = []) {
  const banned = allergenTerms(allergies)
  const diets = dietaryRestrictions.map((d) => String(d).toLowerCase())
  const vegan = diets.some((d) => d.includes('vegan'))
  const animal = ['chicken', 'eggs', 'salmon', 'milk']
  const foods = REFERENCE_FOODS.filter(
    (f) => !conflictsWith(f, banned) && !(vegan && animal.some((a) => f.includes(a))),
  )
  return foods.join(', ')
}

/** Calorie-dense suggestion list with allergen-conflicting items removed. */
export function buildCalorieDenseList(allergies = []) {
  const banned = allergenTerms(allergies)
  return CALORIE_DENSE.filter((f) => !conflictsWith(f, banned)).join(', ')
}

/**
 * Post-generation safety net: scan the parsed plan for prohibited terms in
 * ingredient names, alternative names, meal titles, and notes. Word-boundary
 * matching with phrase exceptions (coconut milk, gluten-free oats, …). Covers
 * allergies AND hard dietary restrictions (vegan/vegetarian/gluten-free).
 * Returns [] when clean.
 */
export function findAllergenViolations(meals, allergies, dietaryRestrictions = []) {
  const banned = [...new Set([...allergenTerms(allergies ?? []), ...restrictionTerms(dietaryRestrictions)])]
  if (banned.length === 0) return []
  const violations = []
  for (const meal of meals ?? []) {
    const fields = [
      ['title', meal.title],
      ['notes', meal.notes],
      ...(meal.ingredients ?? []).flatMap((ing) => [
        ['ingredient', ing.name],
        ...(ing.alternatives ?? []).map((alt) => ['alternative', alt?.name]),
      ]),
    ]
    for (const [where, text] of fields) {
      if (!text) continue
      for (const term of banned) {
        if (conflictsWith(String(text), [term])) {
          violations.push({ meal: meal.title ?? meal.meal_type ?? 'meal', where, text: String(text), term })
        }
      }
    }
  }
  return violations
}
