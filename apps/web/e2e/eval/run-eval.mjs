/**
 * Treno AI Eval Harness — run-eval.mjs
 *
 * Feeds synthetic intake personas through the meal-plan and training-plan
 * prompt builders (logic extracted from the production route handlers), then
 * grades each output with an LLM-as-judge using gpt-4o-mini.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node run-eval.mjs
 *
 * Budget notes:
 *   - Meal-plan generation: gpt-4o-mini (matches production)
 *   - Training-plan generation: gpt-4o-mini (production uses gpt-4.1;
 *     we downgrade here to save eval budget — prompt quality is what we test)
 *   - Judging: gpt-4o-mini
 *   - One pass only; no retries.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PERSONAS = JSON.parse(readFileSync(join(__dirname, 'personas.json'), 'utf8'))
const RUBRIC = JSON.parse(readFileSync(join(__dirname, 'rubric.json'), 'utf8'))

const API_KEY = process.env.OPENAI_API_KEY
if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set')
  process.exit(1)
}

// ---------- prompt builders (extracted from production route handlers) ----------

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function buildMealTimingGuide(wakeTime, workoutTime, workStartTime, workEndTime, sleepTime, mealsPerDay) {
  const wake = timeToMinutes(wakeTime)
  const workout = timeToMinutes(workoutTime)
  const sleep = timeToMinutes(sleepTime)
  const preWorkout = workout - 60
  const postWorkout = workout + 75
  const wakingHours = ((sleep - wake + 1440) % 1440) / 60
  const idealGap = Math.round((wakingHours * 60) / mealsPerDay)
  return [
    `- First meal: ~${minutesToTime(wake + 30)} (30min after waking)`,
    `- Suggested pre-workout meal: ~${minutesToTime(preWorkout)} (1h before workout)`,
    `- Suggested post-workout meal: ~${minutesToTime(postWorkout)} (within 30min after ~1h workout)`,
    `- Work hours: ${workStartTime}–${workEndTime} (meals during work should be easy to prep/eat)`,
    `- Last meal: no later than ${minutesToTime(sleep - 120)} (2h before sleep)`,
    `- Total meals: ${mealsPerDay}`,
    `- Waking hours: ~${wakingHours.toFixed(1)}h → aim for ~${idealGap}min between meals`,
    `- IMPORTANT: Space meals evenly. Never more than 4h between consecutive meals.`,
  ].join('\n')
}

function buildMealPrompts(p) {
  const {
    calories, protein, carbs, fat,
    goal, gender, weight_kg, age, height_cm,
    mealsPerDay = 3,
    wakeTime = '07:00', workoutTime = '08:00',
    workStartTime = '09:00', workEndTime = '17:00', sleepTime = '23:00',
    allergies = [], dietaryRestrictions = [], foodDislikes = [], favouriteFoods = [],
    cookingSkill = 'intermediate', mealPrepPreference = 'daily',
    medicalConditions = [], medications = [],
    stressLevel = 'moderate', sleepQuality = 'average', sleepHours = null,
    targetWeight = null, dayName = null, dayIndex = 0,
    workType = 'desk', alcoholFrequency = 'none', alcoholDetails = '',
    foodAdventurousness = 5, currentSnacks = [], snackMotivation = 'hunger',
    snackPreference = 'both', lateNightSnacking = false,
    harderDays = 'weekends', eatingOutFrequency = 'sometimes',
    planPreference = 'balanced', weeklyDerailers = '',
    desiredOutcome = '', pastDietingChallenges = '',
    workoutDaysPerWeek = 4, activityLevel = 'moderately_active',
    breakfastTime = '08:00', lunchTime = '12:30', dinnerTime = '19:00',
  } = p

  const mealTimingGuide = buildMealTimingGuide(wakeTime, workoutTime, workStartTime, workEndTime, sleepTime, mealsPerDay)

  const constraints = []
  if (dietaryRestrictions.length > 0) constraints.push(`STRICT dietary restrictions: ${dietaryRestrictions.join(', ')}. NEVER include foods that violate these.`)
  if (allergies.length > 0) constraints.push(`ALLERGIES (DANGEROUS — MUST AVOID): ${allergies.join(', ')}. Never include these under any circumstances.`)
  if (foodDislikes.length > 0) constraints.push(`Foods this person HATES and would never eat: ${foodDislikes.join(', ')}. Do not include these.`)
  if (favouriteFoods.length > 0) constraints.push(`FAVOURITE meals/dishes/foods: ${favouriteFoods.join(', ')}. Use these as inspiration.`)
  if (desiredOutcome) constraints.push(`DESIRED OUTCOME: ${desiredOutcome}.`)
  if (pastDietingChallenges) constraints.push(`PAST PLAN CHALLENGES: ${pastDietingChallenges}.`)
  if (weeklyDerailers) constraints.push(`COMMON DERAILERS: ${weeklyDerailers}.`)

  const healthNotes = []
  if (medicalConditions.length > 0) healthNotes.push(`Medical conditions: ${medicalConditions.join(', ')}. Adjust meal choices accordingly.`)
  if (medications.length > 0) healthNotes.push(`Current medications: ${medications.join(', ')}. Be mindful of food-drug interactions.`)
  if (stressLevel === 'high') healthNotes.push('HIGH stress — include magnesium-rich and anti-inflammatory foods where possible.')
  if (sleepQuality === 'poor' || (sleepHours && sleepHours < 6)) healthNotes.push('POOR sleep — include tryptophan-rich foods in evening meal, avoid caffeine after lunch.')

  const cookingContext = {
    none: 'This person CANNOT cook. Use only no-cook meals.',
    basic: 'BASIC cooking skills. Keep recipes dead simple: max 3-4 steps.',
    intermediate: 'Comfortable in the kitchen. Standard recipes are fine.',
    advanced: 'Advanced cook who enjoys cooking. Feel free to suggest complex recipes.',
  }[cookingSkill] ?? 'Comfortable in the kitchen.'

  const prepContext = {
    daily: 'Cooks fresh daily.',
    batch_prep: 'Prefers BATCH PREP. Flag meals great for batch cooking.',
    quick_only: 'Needs QUICK meals only (max 15 min prep).',
    eat_out: 'Eats out often. Suggest meals easy to order at restaurants.',
  }[mealPrepPreference] ?? 'Cooks fresh daily.'

  let alcoholContext = ''
  if (alcoholFrequency !== 'none') {
    const alcoholLabel = { light: '1-3 drinks/week', moderate: '4-7 drinks/week', heavy: '8+ drinks/week' }[alcoholFrequency] ?? ''
    alcoholContext = `ALCOHOL: This person drinks alcohol (${alcoholLabel}${alcoholDetails ? ` — specifically: ${alcoholDetails}` : ''}). Factor alcohol calories into the relevant days.`
  }

  let snackContext = ''
  if (currentSnacks.length > 0 || snackMotivation || snackPreference) {
    const snackLines = []
    if (currentSnacks.length > 0) snackLines.push(`Currently snacks on: ${currentSnacks.join(', ')}`)
    snackLines.push(`Snacks mainly out of: ${snackMotivation}`)
    snackLines.push(`Prefers: ${snackPreference === 'both' ? 'sweet AND savoury' : snackPreference} snacks`)
    if (lateNightSnacking) snackLines.push('Tends to snack late at night — plan for a satisfying evening snack')
    snackContext = `SNACK PROFILE:\n${snackLines.map(l => '- ' + l).join('\n')}`
  }

  const adventureContext = foodAdventurousness <= 3
    ? 'LOW food adventurousness — stick to familiar, classic meals.'
    : foodAdventurousness >= 8
    ? 'HIGH food adventurousness — feel free to suggest exciting, diverse cuisines.'
    : 'MODERATE food adventurousness — mostly familiar foods but open to some variety.'

  const supplementSection = dayIndex === 0 ? `
SUPPLEMENT RECOMMENDATIONS:
Recommend evidence-based supplements. Include "supplements" array with: name, dose, timing, reason.
Only recommend what is relevant to THIS specific client based on their profile.` : ''

  const systemPrompt = `You are an expert nutritionist with 30 years of experience.

CLIENT PROFILE:
- Goal: ${goal || 'maintenance'}${targetWeight ? ` (target: ${targetWeight}kg)` : ''}
- Gender: ${gender || 'not specified'}, Age: ${age || 'not specified'}
- Height: ${height_cm || 'not specified'}cm, Weight: ${weight_kg || 'not specified'}kg
- Job: ${workType} | Activity level: ${activityLevel}
- Exercise: ${workoutDaysPerWeek}x per week
- Sleep: ${sleepHours ? `${sleepHours}h/night` : 'not specified'} (quality: ${sleepQuality})
- Stress: ${stressLevel}
- Food adventurousness: ${foodAdventurousness}/10
${dayName ? `\nGenerating plan for **${dayName}** (day ${dayIndex + 1} of 7).` : ''}

CLIENT SCHEDULE:
- Wake: ${wakeTime} | Work: ${workStartTime}–${workEndTime} | Workout: ${workoutTime} | Sleep: ${sleepTime}
${mealTimingGuide}

${constraints.length > 0 ? 'DIETARY CONSTRAINTS (NON-NEGOTIABLE — ZERO TOLERANCE):\n' + constraints.map(c => '- ' + c).join('\n') : ''}

${healthNotes.length > 0 ? 'HEALTH CONSIDERATIONS:\n' + healthNotes.map(n => '- ' + n).join('\n') : ''}

COOKING & LIFESTYLE:
- ${cookingContext}
- ${prepContext}
- ${adventureContext}

${alcoholContext}

${snackContext}
${supplementSection}

Return ONLY valid JSON in this format:
{
  ${dayName ? '"day_theme": "Fun Day Title",' : ''}
  ${dayIndex === 0 ? '"supplements": [{ "name": "...", "dose": "...", "timing": "...", "reason": "..." }],' : ''}
  "meals": [
    {
      "meal_type": "breakfast|lunch|dinner|snack",
      "label": "Breakfast|Lunch|Dinner|Snack label",
      "title": "Descriptive appetising meal name",
      "time": "HH:MM",
      "timing_note": "Brief timing explanation",
      "notes": "Practical tips",
      "ingredients": [
        {
          "name": "ingredient",
          "amount": 100,
          "unit": "g",
          "calories": 165,
          "protein": 31,
          "carbs": 0,
          "fat": 3.6,
          "alternatives": [{ "name": "substitute", "amount": 100, "unit": "g" }]
        }
      ]
    }
  ]
}

Rules:
- Return exactly ${mealsPerDay} meals
- Breakfast at ${breakfastTime}, Lunch at ${lunchTime}, Dinner at ${dinnerTime}
- Macros MUST sum to: ${calories} kcal (±100), ${protein}g protein (±10g), ${carbs}g carbs (±15g), ${fat}g fat (±8g)
- Use grams for solids, ml for liquids
- NEVER include: ${allergies.join(', ') || 'nothing flagged'}`

  const mainMeals = Math.min(mealsPerDay, 3)
  const snackMeals = mealsPerDay - mainMeals
  const mainPct = snackMeals > 0 ? 0.27 : (1 / mainMeals)
  const snackPct = snackMeals > 0 ? ((1 - mainPct * mainMeals) / snackMeals) : 0
  const budgetGuide = [
    `Per-meal budget:`,
    `- Each main meal (~${mainMeals}): ~${Math.round(calories * mainPct)} cal, ~${Math.round(protein * mainPct)}P`,
    snackMeals > 0 ? `- Each snack (~${snackMeals}): ~${Math.round(calories * snackPct)} cal, ~${Math.round(protein * snackPct)}P` : '',
  ].filter(Boolean).join('\n')

  const userPrompt = `Generate a ${mealsPerDay}-meal plan hitting exactly:
- Calories: ${calories} kcal (±100)
- Protein: ${protein}g (±10g)
- Carbs: ${carbs}g (±15g)
- Fat: ${fat}g (±8g)

${budgetGuide}

Make it exciting and appetising. Return JSON only.`

  return { systemPrompt, userPrompt }
}

function buildTrainingPrompts(p) {
  const {
    goal = 'maintenance', daysPerWeek = 4, gender = 'male', age = 30,
    weight_kg = 70, height_cm = 175, activityLevel = 'moderately_active',
    workoutTime = '08:00', trainingExperience = 'beginner',
    equipmentAccess = 'full_gym', trainingStyles = ['hypertrophy'],
    injuries = [], medicalConditions = [], stressLevel = 'moderate',
    sleepQuality = 'average', sleepHours = 7, secondaryTrainingGoal = 'none',
    maxSessionMinutes = 60, squat1rm = null, bench1rm = null,
    deadlift1rm = null, ohp1rm = null, desiredOutcome = '',
    weeklyDerailers = '', planPreference = 'balanced', harderDays = 'weekends',
  } = p

  const equipmentMap = {
    full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
    home_full: ['barbell', 'dumbbell', 'bodyweight', 'band'],
    home_basic: ['dumbbell', 'bodyweight', 'band'],
    bodyweight_only: ['bodyweight'],
    outdoor: ['bodyweight', 'band'],
  }
  const equipment = equipmentMap[equipmentAccess] ?? equipmentMap.full_gym

  const experienceGuide = {
    never: 'ABSOLUTE BEGINNER — first time in a gym. 2-3 sets × 12-15 reps, conservative loads. Include form cues for every exercise.',
    beginner: 'BEGINNER (< 1 year). 3 sets × 10-12 reps. Foundational compounds, linear progressive overload.',
    intermediate: 'INTERMEDIATE (1-3 years). 3-4 sets × 8-12 reps. Include compounds and isolation.',
    advanced: 'ADVANCED (3+ years). 4-5 sets, varied rep ranges. Advanced techniques welcome.',
  }

  const avoidMap = {
    'Lower back pain': 'AVOID: Conventional deadlifts, heavy barbell squats, good mornings. SUBSTITUTE: Leg press, trap bar deadlift (if pain-free), McGill Big 3.',
    'Shoulder impingement': 'AVOID: Overhead press, upright rows, behind-neck movements. SUBSTITUTE: Landmine press, neutral-grip pressing, face pulls.',
    'Knee pain': 'AVOID: Deep squats, heavy leg extensions, plyometrics. SUBSTITUTE: Leg press (partial ROM), hip-dominant movements (RDL, hip thrust).',
    'Tennis/golfer elbow': 'AVOID: Heavy curls with straight bar, high-volume arm work. SUBSTITUTE: Neutral grip, hammer curls.',
    'Wrist issues': 'AVOID: Heavy barbell pressing. SUBSTITUTE: Dumbbells, neutral grips.',
    'Hip pain': 'AVOID: Deep squats, wide-stance movements. SUBSTITUTE: Hip-friendly machines, limited ROM movements.',
    'Ankle instability': 'AVOID: Box jumps, plyometrics. SUBSTITUTE: Seated calf raises, stability drills.',
    'Neck pain': 'AVOID: Shrugs, behind-neck movements, overhead press. SUBSTITUTE: Neutral spine exercises, face pulls.',
    'Herniated disc': 'AVOID: ALL axial spinal loading (back squats, deadlifts, overhead press). SUBSTITUTE: Machines, leg press, dead bugs, bird dogs.',
  }

  const injurySection = injuries.length > 0
    ? `\nINJURY RESTRICTIONS (NON-NEGOTIABLE — PATIENT SAFETY):\n${injuries.map(inj => `- ${inj}: ${avoidMap[inj] || 'Avoid exercises that load this area.'}`).join('\n')}`
    : ''

  const recoveryNotes = []
  if (stressLevel === 'high') recoveryNotes.push('HIGH LIFE STRESS — reduce volume ~20%. Avoid training to failure.')
  if (sleepQuality === 'poor' || sleepHours < 6) recoveryNotes.push(`POOR RECOVERY (${sleepHours}h sleep) — lower intensity, shorter sessions.`)
  if (medicalConditions.includes('Heart condition')) recoveryNotes.push('HEART CONDITION — avoid heavy Valsalva-dependent movements. RPE 6-7 max. Proper warm-up and cool-down.')
  if (medicalConditions.includes('Asthma')) recoveryNotes.push('ASTHMA — longer progressive warm-up (8-10 min).')
  if (age >= 50) recoveryNotes.push(`AGE (${age}) — prioritise joint-friendly variations, longer warm-ups, mobility work.`)

  const styleGuide = trainingStyles.map(style => ({
    strength: 'Strength-focused: heavy compounds 75-90% 1RM (3-6 reps), 3-5 min rest.',
    hypertrophy: 'Hypertrophy-focused: 65-80% 1RM (8-12 reps), 60-90s rest, controlled tempo.',
    functional: 'Functional training: movement-based, core stability, unilateral work.',
    endurance: 'Muscular endurance: higher reps (15-20), shorter rest (30-60s).',
    mixed: 'Hybrid: blend strength and hypertrophy across the week.',
  }[style] || '')).filter(Boolean).join(' ')

  const secondaryGoalMap = {
    mobility: 'Include 1-2 mobility exercises per session.',
    conditioning: 'Include a conditioning finisher on at least 2 training days.',
    sport_performance: 'Include explosive/power-based movements where appropriate.',
    injury_rehab: 'Include prehab/rehab exercises targeting injured areas.',
    posture: 'Prioritise posterior chain: face pulls, band pull-aparts, dead bugs, 2:1 pull-to-push ratio.',
    none: '',
  }

  const strengthContext = [
    squat1rm ? `Squat 1RM: ${squat1rm}kg` : null,
    bench1rm ? `Bench Press 1RM: ${bench1rm}kg` : null,
    deadlift1rm ? `Deadlift 1RM: ${deadlift1rm}kg` : null,
    ohp1rm ? `OHP 1RM: ${ohp1rm}kg` : null,
  ].filter(Boolean)

  const splitGuide = daysPerWeek <= 3
    ? 'Full body or upper/lower split'
    : daysPerWeek <= 5
    ? 'Push/Pull/Legs, Upper/Lower, or PPL/UL hybrid'
    : 'PPL x2 or body part split'

  const systemPrompt = `You are an elite strength & conditioning coach with 20+ years of experience.

EXPERIENCE LEVEL:
${experienceGuide[trainingExperience] || experienceGuide.beginner}

TRAINING STYLE: ${styleGuide}
${secondaryGoalMap[secondaryTrainingGoal] ? `SECONDARY GOAL: ${secondaryGoalMap[secondaryTrainingGoal]}` : ''}

ATHLETE PROFILE:
- Goal: ${goal}
- Gender: ${gender}, Age: ${age}, Height: ${height_cm}cm, Weight: ${weight_kg}kg
- Activity level: ${activityLevel}
- Available equipment: ${equipment.join(', ')}
- Days per week: ${daysPerWeek}, Max session: ${maxSessionMinutes} min
- Recommended split: ${splitGuide}
- Desired outcome: ${desiredOutcome || 'not specified'}
- Common derailers: ${weeklyDerailers || 'not specified'}
${strengthContext.length > 0 ? `\nSTRENGTH BENCHMARKS:\n${strengthContext.join('\n')}` : ''}
${injurySection}
${recoveryNotes.length > 0 ? '\nRECOVERY CONSIDERATIONS:\n' + recoveryNotes.map(n => '- ' + n).join('\n') : ''}

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  "name": "Plan name",
  "description": "Brief motivating programme description",
  "days": [
    {
      "day_number": 1,
      "name": "Day name",
      "exercises": [
        {
          "name": "Specific exercise name",
          "body_part": "chest|back|shoulders|biceps|triceps|legs|core|full_body",
          "equipment": "${equipment.join('|')}",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Coaching cue or weight suggestion"
        }
      ]
    }
  ]
}

RULES:
- Return exactly ${daysPerWeek} training days
- 5-7 exercises per day (fit within ${maxSessionMinutes} minutes)
- Use ONLY equipment from: ${equipment.join(', ')}
- NEVER include exercises contraindicated by the listed injuries
- Compound movements first, isolation after`

  const userPrompt = `Design a ${daysPerWeek}-day ${trainingStyles.join('/')} programme for ${goal}. Sessions must fit ${maxSessionMinutes} minutes. Return JSON only.`

  return { systemPrompt, userPrompt }
}

// ---------- OpenAI call ----------

async function callOpenAI(messages, model = 'gpt-4o-mini', maxTokens = 3000) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.5 }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(data)}`)
  }
  return { content: data.choices?.[0]?.message?.content ?? '', usage: data.usage }
}

// ---------- Judge call ----------

function buildJudgePrompt(persona, mealPlan, trainingPlan, rubric) {
  const rubricText = Object.entries(rubric.dimensions).map(([key, dim]) => {
    const criteria = dim.criteria.map(c => `  - ${c}`).join('\n')
    return `### ${key.toUpperCase()} (weight: ${dim.weight})\n${dim.description}\nCriteria:\n${criteria}\nScoring 0-5:\n${Object.entries(dim.scoring).map(([s, d]) => `  ${s}: ${d}`).join('\n')}`
  }).join('\n\n')

  const mealSummary = (() => {
    try {
      const parsed = JSON.parse(mealPlan.replace(/^```json?\n?/, '').replace(/\n?```$/, ''))
      const meals = parsed.meals ?? []
      const totalCal = meals.reduce((s, m) => s + (m.ingredients ?? []).reduce((ms, i) => ms + (i.calories ?? 0), 0), 0)
      const totalProt = meals.reduce((s, m) => s + (m.ingredients ?? []).reduce((ms, i) => ms + (i.protein ?? 0), 0), 0)
      const allergenCheck = persona.meal.allergies.map(a => {
        const found = JSON.stringify(parsed).toLowerCase().includes(a.toLowerCase().replace(/s$/, ''))
        return `  ${a}: ${found ? 'FOUND IN PLAN ⚠️' : 'not found ✓'}`
      }).join('\n')
      const diets = persona.meal.dietaryRestrictions.map(d => {
        const planText = JSON.stringify(parsed).toLowerCase()
        let violation = ''
        if (d === 'vegan' && (planText.includes('chicken') || planText.includes('beef') || planText.includes('pork') || planText.includes('fish') || planText.includes('egg') || planText.includes('milk') || planText.includes('dairy') || planText.includes('cheese') || planText.includes('salmon') || planText.includes('tuna'))) {
          violation = '⚠️ possible animal product found'
        }
        if (d === 'gluten-free' && (planText.includes('wheat') || planText.includes('bread') || planText.includes('pasta') || planText.includes('flour') || planText.includes('oat') || planText.includes('barley') || planText.includes('rye'))) {
          violation = '⚠️ possible gluten source found'
        }
        return `  ${d}: ${violation || '✓'}`
      }).join('\n')
      return `Meal plan totals: ~${Math.round(totalCal)} kcal, ~${Math.round(totalProt)}g protein (targets: ${persona.meal.calories} kcal, ${persona.meal.protein}g protein)\nAllergen scan:\n${allergenCheck || '  none flagged'}\nDiet restriction scan:\n${diets || '  none flagged'}\nMeal titles: ${meals.map(m => m.title).join(' | ')}\nSupplements: ${JSON.stringify(parsed.supplements ?? [])}`
    } catch {
      return `[PARSE ERROR — raw content: ${mealPlan.slice(0, 300)}]`
    }
  })()

  const trainingSummary = (() => {
    try {
      const parsed = JSON.parse(trainingPlan.replace(/^```json?\n?/, '').replace(/\n?```$/, ''))
      const days = parsed.days ?? []
      const injuryCheck = persona.training.injuries.map(inj => {
        const allExercises = days.flatMap(d => (d.exercises ?? []).map(e => e.name.toLowerCase()))
        const violations = []
        if (inj === 'Lower back pain') {
          const banned = ['conventional deadlift', 'barbell back squat', 'back squat', 'good morning', 'hyperextension']
          banned.forEach(b => { if (allExercises.some(e => e.includes(b))) violations.push(b) })
        }
        if (inj === 'Knee pain') {
          const banned = ['deep squat', 'plyometric', 'box jump', 'jump squat', 'leg extension']
          banned.forEach(b => { if (allExercises.some(e => e.includes(b))) violations.push(b) })
        }
        if (inj === 'Herniated disc') {
          const banned = ['back squat', 'deadlift', 'overhead press', 'barbell row']
          banned.forEach(b => { if (allExercises.some(e => e.includes(b))) violations.push(b) })
        }
        return `  ${inj}: ${violations.length > 0 ? 'CONTRAINDICATED EXERCISES FOUND: ' + violations.join(', ') + ' ⚠️' : '✓'}`
      }).join('\n')
      const allExercises = days.flatMap(d => (d.exercises ?? []).map(e => e.name))
      return `Training plan: ${days.length} days (expected ${persona.training.daysPerWeek})\nPlan name: ${parsed.name ?? 'missing'}\nInjury check:\n${injuryCheck || '  no injuries flagged'}\nAll exercises: ${allExercises.join(', ')}`
    } catch {
      return `[PARSE ERROR — raw content: ${trainingPlan.slice(0, 300)}]`
    }
  })()

  return {
    systemPrompt: `You are a strict AI quality evaluator for a fitness and nutrition app. You grade AI-generated plans using a rubric and return structured JSON scores. Be critical and honest. Do not give high scores just to be nice. A score of 5 means truly excellent with zero issues.`,
    userPrompt: `Grade these AI-generated plans for the following persona:

PERSONA: ${persona.label}
Description: ${persona.description}
Allergies: ${JSON.stringify(persona.meal.allergies)}
Dietary restrictions: ${JSON.stringify(persona.meal.dietaryRestrictions)}
Medical conditions: ${JSON.stringify(persona.meal.medicalConditions)}
Injuries: ${JSON.stringify(persona.training.injuries)}
Calorie target: ${persona.meal.calories} kcal
Protein target: ${persona.meal.protein}g

MEAL PLAN ANALYSIS:
${mealSummary}

TRAINING PLAN ANALYSIS:
${trainingSummary}

RUBRIC:
${rubricText}

Pass thresholds: each dimension ≥${rubric.pass_thresholds.per_dimension_min}, overall weighted average ≥${rubric.pass_thresholds.overall_average_min}.

Return ONLY valid JSON:
{
  "persona_id": "${persona.id}",
  "scores": {
    "safety": <0-5>,
    "correctness": <0-5>,
    "personalization": <0-5>,
    "completeness": <0-5>,
    "tone": <0-5>
  },
  "weighted_average": <float>,
  "pass": <true|false>,
  "findings": [
    { "dimension": "safety|correctness|personalization|completeness|tone", "severity": "critical|major|minor", "detail": "..." }
  ],
  "summary": "One-sentence overall assessment."
}`
  }
}

// ---------- main ----------

async function main() {
  console.log('=== Treno AI Eval Harness ===')
  console.log(`Personas: ${PERSONAS.length} | Model: gpt-4o-mini | Date: ${new Date().toISOString().slice(0, 10)}\n`)

  const results = []

  for (const persona of PERSONAS) {
    console.log(`\n--- Evaluating: ${persona.label} ---`)

    let mealContent = null
    let trainingContent = null
    let usageTotal = 0

    // 1. Generate meal plan
    try {
      console.log('  Generating meal plan...')
      const { systemPrompt, userPrompt } = buildMealPrompts(persona.meal)
      const { content, usage } = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])
      mealContent = content
      usageTotal += (usage?.total_tokens ?? 0)
      console.log(`  Meal plan: ${usage?.total_tokens ?? '?'} tokens`)
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('quota') || err.message.includes('billing') || err.message.includes('insufficient')) {
        console.error('FATAL: OpenAI auth/quota/billing error. Stopping immediately.')
        console.error(err.message)
        process.exit(2)
      }
      console.error(`  Meal plan error: ${err.message}`)
      mealContent = '{"meals":[]}'
    }

    // 2. Generate training plan
    try {
      console.log('  Generating training plan...')
      const { systemPrompt, userPrompt } = buildTrainingPrompts(persona.training)
      const { content, usage } = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])
      trainingContent = content
      usageTotal += (usage?.total_tokens ?? 0)
      console.log(`  Training plan: ${usage?.total_tokens ?? '?'} tokens`)
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('quota') || err.message.includes('billing') || err.message.includes('insufficient')) {
        console.error('FATAL: OpenAI auth/quota/billing error. Stopping immediately.')
        process.exit(2)
      }
      console.error(`  Training plan error: ${err.message}`)
      trainingContent = '{"days":[]}'
    }

    // 3. Judge
    try {
      console.log('  Judging output...')
      const { systemPrompt, userPrompt } = buildJudgePrompt(persona, mealContent, trainingContent, RUBRIC)
      const { content, usage } = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 'gpt-4o-mini', 1500)
      usageTotal += (usage?.total_tokens ?? 0)
      console.log(`  Judge: ${usage?.total_tokens ?? '?'} tokens`)

      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      const judgeResult = JSON.parse(jsonStr)
      judgeResult.tokens_used = usageTotal
      judgeResult.raw_meal_plan = mealContent
      judgeResult.raw_training_plan = trainingContent
      results.push(judgeResult)
      console.log(`  Result: ${judgeResult.pass ? 'PASS' : 'FAIL'} (avg: ${judgeResult.weighted_average})`)
      console.log(`  ${judgeResult.summary}`)
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('quota') || err.message.includes('billing') || err.message.includes('insufficient')) {
        console.error('FATAL: OpenAI auth/quota/billing error. Stopping immediately.')
        process.exit(2)
      }
      console.error(`  Judge error: ${err.message}`)
      results.push({
        persona_id: persona.id,
        scores: {},
        pass: false,
        findings: [{ dimension: 'completeness', severity: 'critical', detail: `Judge failed: ${err.message}` }],
        summary: 'Evaluation could not complete due to judge error.',
        tokens_used: usageTotal,
      })
    }
  }

  // Write results to stdout as JSON for the scorecard writer
  console.log('\n=== RESULTS JSON ===')
  console.log(JSON.stringify(results, null, 2))

  // Exit code: 0 = all pass, 1 = some fail
  const allPass = results.every(r => r.pass)
  process.exit(allPass ? 0 : 1)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
