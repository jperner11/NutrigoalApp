export const landingCopy = {
  nav: {
    pricing: 'Pricing',
    faq: 'FAQ',
    support: 'Support',
    signIn: 'Sign in',
    createAccount: 'Create account',
  },

  hero: {
    eyebrow: 'Meal & Motion',
    titleLine1: 'One place to build your plan',
    titleLine2: 'or find the right coach.',
    subtitle:
      'Meal plans, training plans, progress tracking, and a directory of Personal Trainers — all in one app.',
    ctaPrimary: 'Find a coach',
    ctaSecondary: 'Create account',
  },

  mockCard: {
    kicker: "Today's plan",
    title: 'Wednesday',
    targetLabel: 'Target kcal',
    targetValue: '2,350',
    nutritionTitle: 'This week',
    nutritionStatus: '76% of meals logged',
    nutritionNote: 'Protein on track',
    nextWorkoutTitle: 'Next workout',
    nextWorkoutName: 'Upper strength · 45 min',
    nextWorkoutNote: 'Adjusted for how much you slept and recovered.',
    nextWorkoutBadge: 'On plan',
  },

  pillars: {
    eyebrow: 'How it works',
    title: 'Plans built around you.',
    items: [
      {
        title: 'Built around you',
        body: 'Every plan is shaped by your goals, schedule, training history, and food preferences.',
      },
      {
        title: 'Food and training in one app',
        body: 'Meal plans and training plans live in the same app, so you never have to switch tools.',
      },
      {
        title: 'Solo or with a coach',
        body: 'Run your own plan with AI, or work with a Personal Trainer inside the app.',
      },
    ],
  },

  coachSection: {
    eyebrow: 'For Personal Trainers',
    title: 'Run your clients in one place.',
    body:
      'Invite clients, build their meal and training plans, message them, collect feedback, and track their progress — all in one app.',
    bullets: [
      'One roster for all your clients',
      'Meal and training plans in the app',
      'Client messaging and feedback requests',
      'A public profile new clients can find you through',
    ],
  },

  individualSection: {
    eyebrow: 'For individuals',
    title: 'A plan that fits how you train.',
    body:
      'Answer a few questions about your goals, schedule, and food preferences. Get a meal plan and a training plan that adapt as you track progress.',
    cards: [
      'Meal planning',
      'Training plans',
      'Progress tracking',
      'Cardio and water logging',
    ],
  },

  discoverSection: {
    eyebrow: 'Discover coaches',
    title: 'Find a coach who trains the way you want.',
    body:
      'Browse Personal Trainers by goal, style, and price. Contact a coach directly and start working together inside the app.',
    bullets: [
      'Browse by goal, format, and price',
      'Compare specialties and style',
      'Contact a coach directly',
      'Work with them inside the app',
    ],
  },
} as const
