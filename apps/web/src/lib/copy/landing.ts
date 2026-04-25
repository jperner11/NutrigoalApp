export const landingCopy = {
  nav: {
    home: 'Home',
    findCoach: 'Find a coach',
    forCoaches: 'For coaches',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    signIn: 'Sign in',
    startFree: 'Start free',
  },

  hero: {
    eyebrow: 'Spring release 01 — open beta',
    region: 'EST. 2024 · LONDON / LISBOA',
    titleLines: ['Eat better.', 'Train smarter.'],
    titleAccent: 'Feel yourself moving.',
    subtitle:
      "One calm app for the plan you follow alone — or the coach you work with when you're ready for more. No feed. No noise. Just your momentum.",
    ctas: {
      forSelf: "I'm here for myself",
      forCoach: "I'm a personal trainer",
      buildPlan: 'Build my first plan',
      browseCoaches: 'Browse coaches first',
      trialNote: '7-day free trial · no card',
    },
    stats: [
      { value: '418', label: 'coaches onboarded' },
      { value: '12k+', label: 'plans generated' },
      { value: '4.8', label: 'avg. client rating' },
      { value: '<24h', label: 'avg. coach reply' },
    ],
  },

  clientPreview: {
    kicker: 'TUESDAY · WEEK 3',
    title: 'Today, briefly.',
    statusChip: 'On track',
    metrics: [
      { label: 'Protein', value: '142', unit: '/ 165g', progress: 0.86 },
      { label: 'Training', value: '38', unit: '/ 45 min', progress: 0.84 },
      { label: 'Water', value: '2.1', unit: '/ 3.0 L', progress: 0.7 },
    ],
    nextMeal: {
      kicker: 'NEXT · 12:30 LUNCH',
      kcal: '560 kcal',
      name: 'Chickpea bowl, tahini, pickled onion',
      macros: ['42 g P', '48 g C', '18 g F'],
    },
    nudge: {
      lead: 'Sleep dipped last night —',
      action: "I lowered today's session by one set.",
    },
  },

  ticker: [
    'No streaks. No notifications guilt-tripping you.',
    'AI that reads your sleep, not just your macros.',
    'Coach marketplace — verified, not vibes.',
    'Plans regenerate when life regenerates.',
    'Hybrid training: lift, run, recover.',
    'Built with coaches, not against them.',
  ],

  threeLanes: {
    eyebrow: 'Three ways in',
    titleMain: 'One app, three doors.',
    titleAccent: 'Pick what fits today.',
    lanes: [
      {
        tag: '01 · SOLO',
        title: 'Plan by yourself.',
        sub: 'AI that reads your life, not just your macros.',
        body:
          'Nine calm questions. We build your first week of meals and training. Regenerate anything that does not fit.',
        bullets: [
          'Meal generator with allergens & budget',
          'Hybrid strength + cardio splits',
          'Grocery list, auto-consolidated',
        ],
        cta: 'Start solo',
        href: '/signup',
      },
      {
        tag: '02 · COACHED',
        title: 'Work with a coach.',
        sub: 'The private side of the app, for you and your PT.',
        body:
          'If your trainer is on Meal & Motion, their plans land here. You log. They watch. The feedback loop is the product.',
        bullets: [
          'Assigned plans from your coach',
          'Weekly check-ins & feedback loop',
          'Messaging without algorithms',
        ],
        cta: 'Have an invite? Open it',
        href: '/signup',
      },
      {
        tag: '03 · DISCOVER',
        title: 'Find a new coach.',
        sub: 'A marketplace with quality, not vibes.',
        body:
          'Browse by goal, budget, format. Send one structured request. No cold DMs, no pricing roulette.',
        bullets: [
          'Structured coach profiles',
          'One-question matching quiz',
          'Accept/decline, no ghosting',
        ],
        cta: 'Browse coaches',
        href: '/find-coach',
      },
    ],
  },
} as const
