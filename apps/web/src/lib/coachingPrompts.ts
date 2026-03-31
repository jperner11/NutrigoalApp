// AI Coaching Prompt Builders
// Each tool auto-fills from user profile and only asks for additional context

interface ProfileData {
  age: number | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  body_fat_pct: number | null
  goal: string | null
  activity_level: string | null
  training_experience: string | null
  years_training: number | null
  equipment_access: string | null
  training_style: string[]
  secondary_training_goal: string | null
  max_session_minutes: number | null
  workout_days_per_week: number | null
  squat_1rm: number | null
  bench_1rm: number | null
  deadlift_1rm: number | null
  ohp_1rm: number | null
  injuries: string[]
  medical_conditions: string[]
  medications: string[]
  sleep_hours: number | null
  sleep_quality: string | null
  stress_level: string | null
  daily_calories: number | null
  daily_protein: number | null
  daily_carbs: number | null
  daily_fat: number | null
  dietary_restrictions: string[]
  allergies: string[]
  alcohol_frequency: string | null
  workout_time: string | null
  wake_time: string | null
  sleep_time: string | null
  does_cardio: boolean
  cardio_types_preferred: string[]
  cardio_frequency_per_week: number | null
  cardio_duration_minutes: number | null
}

function buildAthleteBlock(p: ProfileData): string {
  const lifts = [
    p.squat_1rm && `Squat: ${p.squat_1rm}kg`,
    p.bench_1rm && `Bench: ${p.bench_1rm}kg`,
    p.deadlift_1rm && `Deadlift: ${p.deadlift_1rm}kg`,
    p.ohp_1rm && `OHP: ${p.ohp_1rm}kg`,
  ].filter(Boolean).join(', ')

  return `ATHLETE DATA:
- Age: ${p.age ?? 'unknown'}, Gender: ${p.gender ?? 'unknown'}
- Height: ${p.height_cm ?? 'unknown'}cm, Weight: ${p.weight_kg ?? 'unknown'}kg${p.body_fat_pct ? `, Body fat: ~${p.body_fat_pct}%` : ''}
- Goal: ${p.goal ?? 'maintenance'}
- Activity level: ${p.activity_level ?? 'moderately active'}
- Training experience: ${p.training_experience ?? 'beginner'}${p.years_training ? ` (${p.years_training} years)` : ''}
- Equipment: ${p.equipment_access ?? 'full gym'}
- Training style: ${p.training_style?.join(', ') || 'hypertrophy'}
- Workout days/week: ${p.workout_days_per_week ?? 4}
- Session duration: ${p.max_session_minutes ?? 60} min
- Current lifts: ${lifts || 'Not provided'}
- Injuries: ${p.injuries?.length ? p.injuries.join(', ') : 'None'}
- Medical conditions: ${p.medical_conditions?.length ? p.medical_conditions.join(', ') : 'None'}
- Medications: ${p.medications?.length ? p.medications.join(', ') : 'None'}
- Sleep: ${p.sleep_hours ?? 7}h/night, quality: ${p.sleep_quality ?? 'average'}
- Stress: ${p.stress_level ?? 'moderate'}
- Nutrition: ${p.daily_calories ?? 'not set'} kcal, ${p.daily_protein ?? '?'}g protein, ${p.daily_carbs ?? '?'}g carbs, ${p.daily_fat ?? '?'}g fat
- Dietary restrictions: ${p.dietary_restrictions?.length ? p.dietary_restrictions.join(', ') : 'None'}
- Allergies: ${p.allergies?.length ? p.allergies.join(', ') : 'None'}
- Alcohol: ${p.alcohol_frequency ?? 'none'}
- Cardio: ${p.does_cardio ? `Yes — ${p.cardio_types_preferred?.join(', ') || 'various'}, ${p.cardio_frequency_per_week ?? 2}x/week, ${p.cardio_duration_minutes ?? 30} min sessions` : 'No current cardio'}
- Schedule: Wake ${p.wake_time ?? '07:00'}, Workout ${p.workout_time ?? '08:00'}, Sleep ${p.sleep_time ?? '23:00'}`
}

export type CoachingTool = 'plateau' | 'weak-point' | 'recovery' | 'injury-prevention' | 'tracking' | 'recomp'

export function buildCoachingPrompt(
  toolType: CoachingTool,
  profile: ProfileData,
  additionalInputs: Record<string, string | number>
): { systemPrompt: string; userPrompt: string } {
  const athleteBlock = buildAthleteBlock(profile)

  switch (toolType) {
    case 'plateau':
      return buildPlateauPrompt(athleteBlock, profile, additionalInputs)
    case 'weak-point':
      return buildWeakPointPrompt(athleteBlock, profile, additionalInputs)
    case 'recovery':
      return buildRecoveryPrompt(athleteBlock, profile)
    case 'injury-prevention':
      return buildInjuryPreventionPrompt(athleteBlock, profile)
    case 'tracking':
      return buildTrackingPrompt(athleteBlock, profile, additionalInputs)
    case 'recomp':
      return buildRecompPrompt(athleteBlock, profile, additionalInputs)
  }
}

function buildPlateauPrompt(
  athleteBlock: string,
  profile: ProfileData,
  inputs: Record<string, string | number>
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: `You are a strength coach who specialises in diagnosing and fixing training plateaus in intermediate lifters. You have 20+ years of experience and have helped hundreds of athletes break through stalls using evidence-based periodisation, technique refinement, and lifestyle adjustments. You are thorough, systematic, and leave no stone unturned.

${athleteBlock}

Your analysis must cover ALL of these areas:
1. PROGRAMMING — volume, intensity, frequency, exercise selection, progression model, deload frequency
2. RECOVERY — sleep quality and duration, stress management, training-to-recovery ratio
3. NUTRITION — calorie adequacy, protein timing, meal distribution, micronutrient gaps
4. CARDIO IMPACT — is current cardio volume helping or hindering strength progress? Should it be adjusted?
5. TRAINING PSYCHOLOGY — staleness, motivation, effort quality, mental fatigue

After your analysis, build a detailed 8-week plan specifically designed to break through each stall, with:
- Weekly targets and progression scheme
- Programming adjustments (volume, intensity, exercise swaps)
- Technique focus points for each stalled lift
- Lifestyle changes prioritised by likely impact
- Deload timing and structure

Write this as a thorough coaching consultation. Use clear headings and structured sections. Prioritise the most likely causes based on the athlete data provided.`,

    userPrompt: `I have been stuck on the following lifts for ${inputs.weeksStalled ?? 'several'} weeks despite training consistently:

${inputs.stalledLifts ?? `Squat ${profile.squat_1rm ?? '?'}kg, Bench ${profile.bench_1rm ?? '?'}kg, Deadlift ${profile.deadlift_1rm ?? '?'}kg, OHP ${profile.ohp_1rm ?? '?'}kg`}

I train ${profile.workout_days_per_week ?? 4} days per week, each session about ${profile.max_session_minutes ?? 60} minutes.
My average sleep is ${profile.sleep_hours ?? 7} hours per night.
My stress levels are currently ${profile.stress_level ?? 'moderate'}.
My nutrition: ~${profile.daily_calories ?? '?'} kcal, ~${profile.daily_protein ?? '?'}g protein daily.
I have been lifting for ${profile.years_training ?? '?'} years.

Conduct a thorough analysis and build me an 8-week breakthrough plan.`,
  }
}

function buildWeakPointPrompt(
  athleteBlock: string,
  _profile: ProfileData,
  inputs: Record<string, string | number>
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: `You are a physique coach and movement specialist with extensive experience helping intermediate lifters identify and systematically eliminate weak points in both their aesthetics and performance. You understand muscle anatomy, biomechanics, and how programming errors create imbalances over time.

${athleteBlock}

For each weak point listed, provide:
1. The most likely ROOT CAUSE — muscle imbalance, technique flaw, programming error, or structural limitation
2. Specific corrective and strengthening exercises with sets, reps, tempo, and detailed coaching cues
3. Clear instructions on how to integrate these into the existing programme without accumulating excessive fatigue
4. A realistic timeline for noticeable improvement
5. Measurable markers — numbers, movement quality standards, or visual indicators — that confirm the weak point is genuinely improving

Format this as a prioritised action plan they can begin implementing this week. Write as a thorough coaching consultation with clear headings and structured sections.`,

    userPrompt: `Here are my perceived weak points:

AESTHETIC WEAK POINTS (muscle groups that are visibly underdeveloped):
${inputs.aestheticWeakPoints || 'Not specified — please assess based on my training data'}

PERFORMANCE WEAK POINTS (points in lifts where I fail or lose form):
${inputs.performanceWeakPoints || 'Not specified — please assess based on my lift numbers and training style'}

Give me a prioritised action plan to fix these.`,
  }
}

function buildRecoveryPrompt(
  athleteBlock: string,
  profile: ProfileData
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: `You are a sports science expert and recovery specialist who works with intermediate to advanced strength athletes. You understand the interplay between training stress, sleep physiology, nutrition timing, and nervous system regulation. Your protocols are evidence-based and practical — not generic wellness tips.

${athleteBlock}

Build a COMPLETE, STRUCTURED recovery protocol covering ALL of the following in full detail:

1. SLEEP OPTIMISATION — an optimal sleep routine for a strength athlete including timing, sleep environment, pre-sleep habits, and how to improve sleep quality specifically for someone getting ${profile.sleep_hours ?? 7}h with ${profile.sleep_quality ?? 'average'} quality

2. DAILY MOBILITY ROUTINE — a routine of no more than 20 minutes that can be done every day, with specific exercises, duration, and instructions. Tailor this to their training style and any injuries listed.

3. BREATHING & NERVOUS SYSTEM — downregulation techniques for post-training and before bed. Include specific protocols with timing.

4. DELOAD STRATEGY — how often to deload, how to structure a deload week for their training style, and how to recognise signs that a deload is needed before it is scheduled

5. RECOVERY NUTRITION — evening meal composition, the case for overnight protein, anti-inflammatory dietary approaches. Specific to their current nutrition targets.

6. EVIDENCE-BASED SUPPLEMENTATION — specific supplements with dosing recommendations for recovery. Include: magnesium, omega-3, vitamin D, creatine, and anything else relevant to their profile.

7. ACTIVE RECOVERY & CARDIO — how to use low-intensity cardio and movement on rest days to enhance recovery without adding fatigue. Recommend specific types, duration, and intensity based on their cardio preferences and training load.

8. UNDER-RECOVERY WARNING SIGNS — a list of early warning signs that indicate under-recovery, and a clear protocol for what to do when they appear

Write this as a complete lifestyle system, not a list of disconnected tips. Use clear headings and actionable sections.`,

    userPrompt: `I train ${profile.workout_days_per_week ?? 4} days per week with high intensity. Build me a complete recovery protocol tailored to my profile. My stress is currently ${profile.stress_level ?? 'moderate'} and my sleep is ${profile.sleep_hours ?? 7}h (${profile.sleep_quality ?? 'average'} quality). I want to maximise muscle growth, performance, and long-term joint health.`,
  }
}

function buildInjuryPreventionPrompt(
  athleteBlock: string,
  profile: ProfileData
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: `You are a sports physiotherapist and strength coach who specialises in keeping intermediate lifters healthy, pain-free, and training consistently for the long term. You have deep expertise in biomechanics, movement screening, and prehabilitation.

${athleteBlock}

Build a comprehensive, proactive injury prevention plan covering ALL of the following:

1. COMMON INJURIES — the most common injuries associated with squat, bench press, deadlift, overhead press, and barbell rows. The underlying movement dysfunctions, muscle imbalances, or technique errors that typically cause them. How to identify these risk factors in yourself.

2. PREHAB ROUTINE — a complete prehab routine of no more than 20 minutes, performed 3x/week, covering shoulders, hips, knees, lower back, and elbows. Include specific exercises, sets, reps, and coaching cues.${profile.injuries?.length ? `\n\nCRITICAL: This athlete has existing injuries: ${profile.injuries.join(', ')}. Pay special attention to these areas.` : ''}

3. WARM-UP PROTOCOL — a smart warm-up for heavy training sessions that prepares the nervous system and protects joints without causing fatigue before working sets

4. TRAINING AROUND NIGGLES — a framework for modifying exercises, reducing load, and managing discomfort without making things worse

5. RED FLAGS — clear red flags that distinguish a real injury requiring rest or professional assessment from normal training soreness

6. RETURN-TO-TRAINING — a protocol for returning after a short layoff due to illness or injury

7. TECHNIQUE ADJUSTMENTS — modifications for each major lift that reduce joint stress without compromising performance

Write this as a thorough, practical physiotherapy consultation with clear headings and specific actionable advice.`,

    userPrompt: `I want a comprehensive injury prevention plan built around heavy compound lifting. I train ${profile.workout_days_per_week ?? 4}x/week, focusing on ${profile.training_style?.join(', ') || 'hypertrophy'}. ${profile.injuries?.length ? `I currently have: ${profile.injuries.join(', ')}.` : 'I currently have no injuries but want to stay that way.'} Give me everything I need to stay healthy long-term.`,
  }
}

function buildTrackingPrompt(
  athleteBlock: string,
  profile: ProfileData,
  inputs: Record<string, string | number>
): { systemPrompt: string; userPrompt: string } {
  const duration = inputs.programmeDurationWeeks ?? 12
  return {
    systemPrompt: `You are a high-performance coach who specialises in data-driven accountability systems for intermediate lifters. You believe that what gets measured gets managed, and you design tracking systems that are thorough without being obsessive.

${athleteBlock}

Design a complete ${duration}-week monitoring framework that includes:

1. WEEKLY CHECK-IN TEMPLATE — covering bodyweight (how to track accurately, account for fluctuations), key lift numbers and how to log them meaningfully, subjective scores for energy/recovery/mood/training performance, sleep quality and duration, and nutritional adherence

2. PHOTO PROGRESS PROTOCOL — which angles to use, lighting and background guidelines, timing relative to food and water intake, and how to make accurate comparisons over time

3. MUSCLE MEASUREMENT PROTOCOL — which body parts to measure, how to measure consistently, how often, and how to interpret the data

4. DATA-DRIVEN DECISION GUIDE — exactly what changes to make based on tracking data. Examples:
   - If bodyweight hasn't moved in 2 weeks, do X
   - If strength is dropping despite adequate calories, do Y
   - If measurements increasing but weight stable, interpret as Z

5. MONTHLY REVIEW FRAMEWORK — assess overall progress, identify patterns, reset targets for the next block

6. PSYCHOLOGY OF TRACKING — how to use data to stay motivated without becoming obsessive. How to interpret slow progress in a way that keeps you consistent.

Write this as the monitoring system of a professional athlete. Use clear headings and practical templates.`,

    userPrompt: `I'm running a ${duration}-week ${profile.goal ?? 'muscle-building'} programme training ${profile.workout_days_per_week ?? 4}x/week. Design me a complete tracking and accountability system. I want to know exactly what to track, when to track it, and what to do with the data.`,
  }
}

function buildRecompPrompt(
  athleteBlock: string,
  profile: ProfileData,
  inputs: Record<string, string | number>
): { systemPrompt: string; userPrompt: string } {
  const bodyFat = inputs.latestBodyFatPct ?? profile.body_fat_pct
  return {
    systemPrompt: `You are an elite strength coach and sports nutritionist specialising in body recomposition for intermediate natural lifters. You understand the science of simultaneous fat loss and muscle gain — when it works, when it doesn't, and how to maximise results for someone at this training age.

${athleteBlock}${bodyFat ? `\nLatest body fat estimate: ~${bodyFat}%` : ''}

Build a complete 16-week recomposition blueprint covering ALL of the following:

1. HONEST ASSESSMENT — is recomposition achievable for someone at this training age and body composition? What are realistic expectations over 16 weeks?

2. TRAINING PROGRAMME — optimised specifically for recomposition. Include split, exercise selection principles, sets, reps, and how it differs from a pure hypertrophy or pure fat loss programme

3. NUTRITION STRATEGY — calorie targets, macro breakdown, meal timing. How to structure eating on training vs rest days (calorie cycling). Specific numbers based on their current stats.

4. CARDIO STRATEGY — type, frequency, duration. How to support fat loss without compromising muscle retention or recovery

5. TRACKING PROTOCOL — how to know if recomposition is actually occurring when the scale barely moves. What metrics to watch.

6. PHASE ADJUSTMENTS — how to adjust at the 4, 8, and 12-week marks based on results

7. COMMON MISTAKES — the most common errors intermediate lifters make during recomposition and how to avoid them

8. SUPPLEMENT RECOMMENDATIONS — evidence-based supplements that support recomposition

Write this as a complete, actionable 16-week system. Use clear headings and specific numbers/ranges.`,

    userPrompt: `I want to achieve genuine body recomposition over the next 16 weeks. My stats: ${profile.weight_kg ?? '?'}kg, ${profile.height_cm ?? '?'}cm, ${profile.age ?? '?'} years old, ${profile.gender ?? 'male'}.${bodyFat ? ` Approximate body fat: ${bodyFat}%.` : ''} I've been training for ${profile.years_training ?? '?'} years. Current lifts: Squat ${profile.squat_1rm ?? '?'}kg, Bench ${profile.bench_1rm ?? '?'}kg, Deadlift ${profile.deadlift_1rm ?? '?'}kg. I can train ${profile.workout_days_per_week ?? 4} days per week. Give me the complete blueprint.`,
  }
}
