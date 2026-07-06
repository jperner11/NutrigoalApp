/**
 * Treno AI Eval Harness
 *
 * Loads 3 synthetic intake personas, reconstructs the prompts the real
 * generate-meal-plan and generate-training-plan routes would send, calls
 * OpenAI gpt-4o-mini for generation, then calls it again for LLM-as-judge
 * scoring. Writes a JSON results file to stdout (captured by the CI caller).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node apps/web/e2e/eval/eval-harness.mjs
 *
 * One pass only, no retries. Budget: ≤9 OpenAI calls total (3 personas × 3 calls).
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dir = dirname(__filename)

const API_KEY = process.env.OPENAI_API_KEY
if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set')
  process.exit(1)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

async function callOpenAI(messages, model = 'gpt-4o-mini', maxTokens = 3000) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

// ── meal plan prompt builder (mirrors route logic) ────────────────────────────

function buildMealPlanPrompts(m) {
  const wake = timeToMinutes(m.wakeTime)
  const workout = timeToMinutes(m.workoutTime)
  const sleep = timeToMinutes(m.sleepTime)
  const wakingHours = ((sleep - wake + 1440) % 1440) / 60
  const idealGap = Math.round((wakingHours * 60) / m.mealsPerDay)

  const timingGuide = [
    `- First meal: ~${minutesToTime(wake + 30)} (30min after waking)`,
    `- Suggested pre-workout meal: ~${minutesToTime(workout - 60)} (1h before workout)`,
    `- Suggested post-workout meal: ~${minutesToTime(workout + 75)} (within 75min after workout)`,
    `- Work hours: ${m.workStartTime}–${m.workEndTime} (meals should be portable)`,
    `- Last meal: no later than ${minutesToTime(sleep - 120)} (2h before sleep)`,
    `- Total meals: ${m.mealsPerDay}`,
    `- Waking hours: ~${wakingHours.toFixed(1)}h → aim for ~${idealGap}min between meals`,
  ].join('\n')

  const constraints = []
  if (m.dietaryRestrictions?.length) constraints.push(`STRICT dietary restrictions: ${m.dietaryRestrictions.join(', ')}. NEVER include foods that violate these.`)
  if (m.allergies?.length) constraints.push(`ALLERGIES (DANGEROUS — MUST AVOID): ${m.allergies.join(', ')}. Never include these under any circumstances.`)
  if (m.foodDislikes?.length) constraints.push(`Foods this person HATES: ${m.foodDislikes.join(', ')}. Do not include.`)
  if (m.favouriteFoods?.length) constraints.push(`FAVOURITE foods: ${m.favouriteFoods.join(', ')}. Use as inspiration.`)

  const healthNotes = []
  if (m.medicalConditions?.length) healthNotes.push(`Medical conditions: ${m.medicalConditions.join(', ')}. Adjust meal choices accordingly (low sodium for hypertension, etc.).`)
  if (m.medications?.length) healthNotes.push(`Current medications: ${m.medications.join(', ')}. Be mindful of food-drug interactions.`)
  if (m.stressLevel === 'high') healthNotes.push('HIGH stress — include magnesium-rich and anti-inflammatory foods.')
  if (m.sleepQuality === 'poor' || (m.sleepHours && m.sleepHours < 6)) healthNotes.push('POOR sleep — include tryptophan-rich foods in evening meal.')

  const cookingCtx = {
    none: 'CANNOT cook. No-cook meals only (sandwiches, salads, smoothies).',
    basic: 'BASIC cooking. Max 3-4 steps, common ingredients.',
    intermediate: 'Comfortable in the kitchen. Standard recipes fine.',
    advanced: 'Advanced cook — feel free to suggest complex recipes.',
  }[m.cookingSkill] ?? 'Standard recipes fine.'

  const prepCtx = {
    daily: 'Cooks fresh daily.',
    batch_prep: 'Prefers BATCH PREP. Flag batch-cook meals.',
    quick_only: 'QUICK meals only (max 15 min).',
    eat_out: 'Eats out often.',
  }[m.mealPrepPreference] ?? 'Cooks fresh daily.'

  const systemPrompt = `You are an expert nutritionist generating a single-day meal plan.

CLIENT PROFILE:
- Goal: ${m.goal}${m.targetWeight ? ` (target: ${m.targetWeight}kg)` : ''}
- Gender: ${m.gender}, Age: ${m.age}, Height: ${m.height_cm}cm, Weight: ${m.weight_kg}kg
- Activity: ${m.activityLevel}, Workouts: ${m.workoutDaysPerWeek}x/week
- Sleep: ${m.sleepHours}h (quality: ${m.sleepQuality}), Stress: ${m.stressLevel}

SCHEDULE:
${timingGuide}

${constraints.length ? 'DIETARY CONSTRAINTS (NON-NEGOTIABLE):\n' + constraints.map(c => '- ' + c).join('\n') : ''}

${healthNotes.length ? 'HEALTH CONSIDERATIONS:\n' + healthNotes.map(n => '- ' + n).join('\n') : ''}

COOKING & LIFESTYLE:
- ${cookingCtx}
- ${prepCtx}

Return ONLY valid JSON (no markdown fences) in this shape:
{
  "meals": [
    {
      "meal_type": "breakfast|lunch|dinner|snack",
      "label": "Breakfast",
      "title": "Descriptive meal name",
      "time": "07:00",
      "timing_note": "brief note",
      "notes": "practical tips",
      "ingredients": [
        { "name": "...", "amount": 100, "unit": "g", "calories": 300, "protein": 20, "carbs": 30, "fat": 10 }
      ]
    }
  ]
}`

  const userPrompt = `Generate a ${m.mealsPerDay}-meal plan hitting EXACTLY:
- Calories: ${m.calories} kcal (±50 kcal)
- Protein: ${m.protein}g (±5g)
- Carbs: ${m.carbs}g (±10g)
- Fat: ${m.fat}g (±5g)

Breakfast at ${m.breakfastTime}, Lunch at ${m.lunchTime}, Dinner at ${m.dinnerTime}.
Return JSON only.`

  return { systemPrompt, userPrompt }
}

// ── training plan prompt builder (mirrors route logic) ────────────────────────

function buildTrainingPlanPrompts(t) {
  const expGuide = {
    never: 'ABSOLUTE BEGINNER. Basic movements only, 2-3 sets × 12-15 reps, full form cues.',
    beginner: 'BEGINNER (<1 year). Foundational compounds, 3 sets × 10-12 reps, linear progression.',
    intermediate: 'INTERMEDIATE (1-3 years). 3-4 sets × 8-12 reps. Compounds + isolation.',
    advanced: 'ADVANCED (3+ years). 4-5 sets, varied rep ranges, advanced techniques.',
  }[t.trainingExperience] ?? 'BEGINNER.'

  const injuryAvoidMap = {
    'Lower back pain': 'AVOID: Conventional deadlifts, heavy barbell squats. SUBSTITUTE: Leg press, belt squat, trap bar deadlift.',
    'Herniated disc': 'AVOID ALL axial spinal loading (back squats, deadlifts, overhead press, barbell rows). SUBSTITUTE: Machines, chest-supported rows, leg press, core stability (dead bugs, bird dogs).',
    'Shoulder impingement': 'AVOID: Overhead press, upright rows, wide-grip bench. SUBSTITUTE: Landmine press, lateral raises below 90°, face pulls.',
    'Knee pain': 'AVOID: Deep squats, heavy leg extensions, plyometrics. SUBSTITUTE: Leg press (partial ROM), hip thrusts, box squats.',
  }

  const injurySection = t.injuries?.length
    ? '\nINJURY RESTRICTIONS (NON-NEGOTIABLE):\n' + t.injuries.map(i => `- ${i}: ${injuryAvoidMap[i] || 'Avoid all exercises that load this area.'}`).join('\n')
    : ''

  const recoveryNotes = []
  if (t.stressLevel === 'high') recoveryNotes.push('HIGH stress — reduce volume ~20%, avoid failure.')
  if (t.sleepQuality === 'poor' || (t.sleepHours && t.sleepHours < 6)) recoveryNotes.push('POOR RECOVERY — lower intensity ceiling, shorter sessions.')
  if (t.medicalConditions?.includes('Heart condition')) recoveryNotes.push('HEART CONDITION — keep RPE ≤7, no Valsalva manoeuvre, 5-min warm-up mandatory.')
  if (t.medicalConditions?.includes('Hypertension')) recoveryNotes.push('HYPERTENSION — avoid isometric holds >5s, monitor exertion, keep rest periods ≥90s.')
  if (t.age >= 50) recoveryNotes.push(`AGE (${t.age}) — joint-friendly variations, longer warm-ups, favour machines.`)

  const equipMap = {
    full_gym: 'barbell, dumbbell, machine, cable, bodyweight',
    home_full: 'barbell, dumbbell, bodyweight, band',
    home_basic: 'dumbbell, bodyweight, band',
    bodyweight_only: 'bodyweight',
  }
  const equipment = equipMap[t.equipmentAccess] ?? 'barbell, dumbbell, machine, cable, bodyweight'

  const systemPrompt = `You are an elite strength & conditioning coach generating a weekly training programme.

EXPERIENCE LEVEL: ${expGuide}
TRAINING STYLE: ${t.trainingStyles?.join(', ') || 'hypertrophy'}

ATHLETE PROFILE:
- Goal: ${t.goal}, Gender: ${t.gender}, Age: ${t.age}
- Height: ${t.height_cm}cm, Weight: ${t.weight_kg}kg
- Equipment: ${equipment}
- Days/week: ${t.daysPerWeek}, Max session: ${t.maxSessionMinutes} min
- Desired outcome: ${t.desiredOutcome || 'not specified'}
${t.squat1rm ? `- Squat 1RM: ${t.squat1rm}kg, Bench 1RM: ${t.bench1rm}kg, Deadlift 1RM: ${t.deadlift1rm}kg` : '- No 1RM data — use conservative weight suggestions.'}
${injurySection}
${recoveryNotes.length ? '\nRECOVERY CONSIDERATIONS:\n' + recoveryNotes.map(n => '- ' + n).join('\n') : ''}

SAFETY IS NON-NEGOTIABLE: NEVER prescribe exercises that conflict with listed injuries or medical conditions.

Return ONLY valid JSON (no markdown fences):
{
  "name": "Plan name",
  "description": "Brief programme description",
  "days": [
    {
      "day_number": 1,
      "name": "Day name",
      "exercises": [
        { "name": "Exercise name", "body_part": "chest|back|shoulders|biceps|triceps|legs|core|full_body", "equipment": "barbell|dumbbell|machine|cable|bodyweight|band", "sets": 3, "reps": "8-12", "rest_seconds": 90, "notes": "coaching cue" }
      ]
    }
  ]
}`

  const userPrompt = `Design a ${t.daysPerWeek}-day ${t.trainingStyles?.join('/')} programme for ${t.goal}. Sessions must fit within ${t.maxSessionMinutes} minutes. Return JSON only.`

  return { systemPrompt, userPrompt }
}

// ── judge prompt ─────────────────────────────────────────────────────────────

function buildJudgePrompt(personaId, intake, mealPlan, trainingPlan) {
  return {
    systemPrompt: `You are an AI quality evaluator for a fitness app. Score the provided meal plan and training plan against a rubric. Return ONLY valid JSON.`,
    userPrompt: `PERSONA: ${personaId}
KEY INTAKE FACTS:
- Goal: ${intake.meal.goal}
- Allergies: ${intake.meal.allergies?.join(', ') || 'none'}
- Dietary restrictions: ${intake.meal.dietaryRestrictions?.join(', ') || 'none'}
- Medical conditions: ${intake.meal.medicalConditions?.join(', ') || 'none'}
- Injuries: ${intake.training.injuries?.join(', ') || 'none'}
- Age: ${intake.meal.age}, Calorie target: ${intake.meal.calories} kcal, Protein target: ${intake.meal.protein}g
- Training experience: ${intake.training.trainingExperience}

GENERATED MEAL PLAN:
${mealPlan}

GENERATED TRAINING PLAN:
${trainingPlan}

Score each dimension 1–5 (5=excellent). Then provide a brief rationale for each score, and a list of any specific violations found.

Return JSON:
{
  "scores": {
    "safety": <1-5>,
    "correctness": <1-5>,
    "personalization": <1-5>,
    "completeness": <1-5>,
    "tone": <1-5>
  },
  "rationale": {
    "safety": "...",
    "correctness": "...",
    "personalization": "...",
    "completeness": "...",
    "tone": "..."
  },
  "violations": ["list any explicit allergy/injury/medical violations here, or empty array"]
}`,
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

const FIXTURE_DIR = join(__dir, 'fixtures')
const PERSONA_FILES = [
  'persona-cutting.json',
  'persona-vegan-allergies.json',
  'persona-injury-medical.json',
]

const results = []

for (const fname of PERSONA_FILES) {
  const intake = JSON.parse(readFileSync(join(FIXTURE_DIR, fname), 'utf8'))
  const personaId = intake._id
  console.error(`\n=== Evaluating ${personaId} ===`)

  let mealPlanRaw = ''
  let trainingPlanRaw = ''
  let judgeScores = null
  let error = null

  try {
    // 1. Generate meal plan
    console.error('  Generating meal plan...')
    const { systemPrompt: mSys, userPrompt: mUser } = buildMealPlanPrompts(intake.meal)
    mealPlanRaw = await callOpenAI([
      { role: 'system', content: mSys },
      { role: 'user', content: mUser },
    ], 'gpt-4o-mini', 2500)

    // 2. Generate training plan
    console.error('  Generating training plan...')
    const { systemPrompt: tSys, userPrompt: tUser } = buildTrainingPlanPrompts(intake.training)
    trainingPlanRaw = await callOpenAI([
      { role: 'system', content: tSys },
      { role: 'user', content: tUser },
    ], 'gpt-4o-mini', 2500)

    // 3. Judge
    console.error('  Judging output...')
    const { systemPrompt: jSys, userPrompt: jUser } = buildJudgePrompt(personaId, intake, mealPlanRaw, trainingPlanRaw)
    const judgeRaw = await callOpenAI([
      { role: 'system', content: jSys },
      { role: 'user', content: jUser },
    ], 'gpt-4o-mini', 1000)

    const stripped = judgeRaw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    judgeScores = JSON.parse(stripped)
    console.error(`  Scores: ${JSON.stringify(judgeScores.scores)}`)
  } catch (err) {
    error = err.message
    console.error(`  ERROR: ${err.message}`)
  }

  results.push({
    personaId,
    description: intake._description,
    mealPlanSample: mealPlanRaw.slice(0, 300),
    trainingPlanSample: trainingPlanRaw.slice(0, 300),
    judgeScores,
    error,
  })
}

// Write JSON results to stdout for capture
console.log(JSON.stringify(results, null, 2))
