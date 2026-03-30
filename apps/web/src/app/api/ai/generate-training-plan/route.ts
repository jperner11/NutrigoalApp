import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`ai-training:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'AI service not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const {
      goal = 'maintenance',
      daysPerWeek = 4,
      gender = 'male',
      age = 30,
      weight_kg = 70,
      activityLevel = 'moderately_active',
      workoutTime = '08:00',
      // Anamnesis data
      trainingExperience = 'beginner',
      equipmentAccess = 'full_gym',
      trainingStyles = ['hypertrophy'],
      injuries = [],
      medicalConditions = [],
      stressLevel = 'moderate',
      sleepQuality = 'average',
    } = body

    // Map equipment access to available equipment
    const equipmentMap: Record<string, string[]> = {
      full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
      home_full: ['barbell', 'dumbbell', 'bodyweight', 'band'],
      home_basic: ['dumbbell', 'bodyweight', 'band'],
      bodyweight_only: ['bodyweight'],
      outdoor: ['bodyweight', 'band'],
    }
    const equipment = equipmentMap[equipmentAccess] ?? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']

    // Map experience to volume/intensity guidance
    const experienceGuide: Record<string, string> = {
      never: 'ABSOLUTE BEGINNER. Use only basic movements, focus on form. 2-3 sets, higher reps (12-15), lighter weights. Include exercise descriptions. Full body or simple upper/lower only.',
      beginner: 'BEGINNER (< 1 year). Stick to foundational compound movements. 3 sets, 10-12 reps. Progressive overload focus. Simple splits only.',
      intermediate: 'INTERMEDIATE (1-3 years). Can handle moderate volume and intensity. 3-4 sets, 8-12 reps. Include both compound and isolation. Standard splits.',
      advanced: 'ADVANCED (3+ years). Higher volume and intensity. 4-5 sets, various rep ranges. Include advanced techniques (supersets, drop sets). Periodized approach.',
    }

    // Build injury avoidance section
    const injurySection = injuries.length > 0
      ? `\nINJURY RESTRICTIONS (CRITICAL - MUST FOLLOW):\n${injuries.map((inj: string) => {
          const avoidMap: Record<string, string> = {
            'Lower back pain': 'AVOID: Deadlifts, heavy squats, good mornings, hyperextensions. USE: Leg press, belt squat, core stabilization.',
            'Shoulder impingement': 'AVOID: Overhead press, upright rows, behind-neck press. USE: Landmine press, lateral raises below 90°, face pulls.',
            'Knee pain': 'AVOID: Deep squats, leg extensions with heavy weight, jumping. USE: Leg press (partial range), hip-dominant movements.',
            'Tennis/golfer elbow': 'AVOID: Heavy curls, wrist-heavy grips. USE: Neutral grip, fat grips, reduce isolation arm volume.',
            'Wrist issues': 'AVOID: Heavy barbell pressing, front squats. USE: Dumbbells, neutral grips, wrist wraps recommended.',
            'Hip pain': 'AVOID: Deep squats, wide-stance movements. USE: Hip-friendly machines, limited range of motion.',
            'Ankle instability': 'AVOID: Heavy calf raises, plyometrics. USE: Seated calf raises, stability exercises.',
            'Neck pain': 'AVOID: Shrugs, behind-neck movements, overhead press. USE: Neutral spine exercises, avoid loaded cervical flexion.',
            'Herniated disc': 'AVOID: ALL spinal loading (squats, deadlifts, overhead press). USE: Machines, supported movements, core stability.',
          }
          return `- ${inj}: ${avoidMap[inj] || `Avoid exercises that stress this area. Substitute with pain-free alternatives.`}`
        }).join('\n')}`
      : ''

    // Build recovery considerations
    const recoveryNotes: string[] = []
    if (stressLevel === 'high') recoveryNotes.push('HIGH STRESS: Reduce total volume by ~20%. Include more deload/recovery exercises. Avoid failure on most sets.')
    if (sleepQuality === 'poor') recoveryNotes.push('POOR SLEEP: Lower intensity, avoid training to failure. Reduce session duration. Extra rest between sets (3+ min for compounds).')
    if (medicalConditions.includes('Heart condition')) recoveryNotes.push('HEART CONDITION: Avoid very heavy lifts and Valsalva maneuver. Keep intensity moderate. Include proper warm-up/cool-down.')
    if (medicalConditions.includes('Asthma')) recoveryNotes.push('ASTHMA: Include longer warm-up. Avoid exercises in cold/dry environments if training outdoors.')

    // Training style guidance
    const styleGuide = trainingStyles.map((style: string) => {
      const guides: Record<string, string> = {
        strength: 'Focus on heavy compounds (3-5 reps), longer rest (3-5 min), lower total volume.',
        hypertrophy: 'Moderate weight (8-12 reps), controlled tempo, 60-90s rest, higher volume.',
        functional: 'Movement-based exercises, core stability, unilateral work, mobility drills.',
        endurance: 'Higher reps (15-20), shorter rest (30-60s), circuit-style optional.',
        mixed: 'Blend strength and hypertrophy work across the week.',
      }
      return guides[style] || ''
    }).filter(Boolean).join(' ')

    const splitGuide = daysPerWeek <= 3
      ? 'Full body or upper/lower split'
      : daysPerWeek <= 5
      ? 'Push/Pull/Legs, Upper/Lower, or Push/Pull/Legs/Upper/Lower'
      : 'PPL x2 or body part split'

    const systemPrompt = `You are a certified strength & conditioning specialist (CSCS) with 15+ years of experience designing training programmes for athletes and general fitness clients. You treat every user as a real patient — their injuries, medical conditions, and physical limitations are non-negotiable constraints.

YOUR APPROACH:
- You follow evidence-based training principles (NSCA, ACSM guidelines).
- You NEVER prescribe exercises that aggravate the patient's injuries or conflict with their medical conditions — there are no exceptions.
- You design programmes appropriate for the patient's experience level — beginners get foundational movements, not advanced techniques.
- You prioritise safety, progressive overload, and long-term adherence over novelty.

EXPERIENCE LEVEL:
${experienceGuide[trainingExperience] || experienceGuide.beginner}

TRAINING STYLE PREFERENCE: ${styleGuide}

PATIENT PROFILE:
- Goal: ${goal} (${goal === 'bulking' ? 'muscle gain - progressive overload focus' : goal === 'cutting' ? 'fat loss - maintain muscle, moderate volume' : 'maintenance - balanced'})
- Gender: ${gender}, Age: ${age}, Weight: ${weight_kg}kg
- Activity level: ${activityLevel}
- Available equipment: ${equipment.join(', ')}
- Workout time: ${workoutTime}
- Days per week: ${daysPerWeek}
- Recommended split: ${splitGuide}
${injurySection}
${recoveryNotes.length > 0 ? '\nPATIENT RECOVERY CONSIDERATIONS (CLINICAL):\n' + recoveryNotes.map(n => '- ' + n).join('\n') : ''}

Return ONLY valid JSON. No markdown, no explanation.

Format:
{
  "name": "Plan name (e.g. 4-Day Upper/Lower Split)",
  "description": "Brief program description",
  "days": [
    {
      "day_number": 1,
      "name": "Day name (e.g. Upper Body A - Push Focus)",
      "exercises": [
        {
          "name": "Exercise name",
          "body_part": "chest|back|shoulders|biceps|triceps|legs|core|full_body",
          "equipment": "barbell|dumbbell|machine|cable|bodyweight|band",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Optional coaching cue or modification"
        }
      ]
    }
  ]
}

Rules:
- Return exactly ${daysPerWeek} training days
- 5-8 exercises per day
- Use ONLY equipment from the available list
- body_part: chest, back, shoulders, biceps, triceps, legs, core, full_body
- equipment: ${equipment.join(', ')}
- Compound movements first, isolation after
- Include warm-up note for first compound
- Balance push/pull across the week
- Each muscle group trained 2x/week minimum
- NEVER include exercises that conflict with listed injuries
- The ${daysPerWeek} days MUST include any conditioning/cardio days — do NOT exceed ${daysPerWeek} total training days
- Use specific exercise names (e.g. "Barbell Bench Press" not just "Bench Press")`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a ${daysPerWeek}-day ${trainingStyles.join('/')} training plan for ${goal}. Return JSON only.` },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      return NextResponse.json({ message: 'AI service error' }, { status: 502 })
    }

    const aiData = await openaiResponse.json()
    const content = aiData.choices?.[0]?.message?.content?.trim() ?? '{}'

    let parsed
    try {
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ message: 'Failed to parse AI response' }, { status: 502 })
    }

    // Resolve exercise IDs server-side (bypass RLS with service role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(parsed) // fallback: return without IDs
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Load existing exercises
    const { data: dbExercises } = await supabase.from('exercises').select('id, name')
    const exerciseMap = new Map((dbExercises ?? []).map(e => [e.name.toLowerCase(), e.id]))

    const validBodyParts = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'full_body'])
    const validEquipment = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band'])

    for (const day of (parsed.days ?? [])) {
      for (const ex of (day.exercises ?? [])) {
        const key = ex.name.toLowerCase()
        if (exerciseMap.has(key)) {
          ex.exercise_id = exerciseMap.get(key)
        } else {
          // Create the exercise
          const bodyPart = validBodyParts.has(ex.body_part) ? ex.body_part : 'full_body'
          const equip = validEquipment.has(ex.equipment) ? ex.equipment : 'bodyweight'
          const { data: newEx } = await supabase
            .from('exercises')
            .insert({
              name: ex.name,
              body_part: bodyPart,
              equipment: equip,
              is_compound: ['chest', 'back', 'legs', 'full_body'].includes(bodyPart) && (day.exercises.indexOf(ex) < 3),
            })
            .select('id')
            .single()

          if (newEx) {
            ex.exercise_id = newEx.id
            exerciseMap.set(key, newEx.id)
          }
        }
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
