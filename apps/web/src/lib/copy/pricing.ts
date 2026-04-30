// All public-facing strings for the /pricing page live here.
// Keeping copy out of the component makes later i18n a mechanical lift.

export const pricingCopy = {
  nav: {
    signIn: 'Sign in',
    createAccount: 'Create account',
  },

  hero: {
    eyebrow: 'Pricing',
    titleLine1: 'Simple pricing for',
    titleLine2: 'individuals and coaches.',
    subtitle:
      'Pick a plan that matches how you train or how you coach. Change or cancel any time.',
    discoverBadge: 'Find a coach on every plan, including Free.',
  },

  individuals: {
    eyebrow: 'Individuals',
    title: 'Train yourself.',
    subtitle:
      'Start free. Upgrade when you want full plans, unlimited regeneration, and more AI.',
  },

  individualTiers: {
    free: {
      strap: 'Start here',
      ctaLabel: 'Start free',
    },
    pro: {
      strap: 'Most popular',
      badge: '7-day free trial',
      ctaLabel: 'Start 7-day free trial',
      trialNote: 'Try Pro free for 7 days, then $4.99/month. Cancel any time.',
    },
    unlimited: {
      strap: 'For heavy users',
      ctaLabel: 'Go Unlimited',
    },
  },

  coach: {
    eyebrow: 'Coaches',
    title: 'One plan for Personal Trainers.',
    subtitle:
      'Everything you need to run your clients in one place: meal and training plans, messaging, progress tracking, custom intake, and a public profile new clients can find you through.',
    planBadge: 'Coach Pro',
    pricePerMonth: '/month',
    tagline: 'Manage up to 15 clients. Everything included.',
    separateOffersNote:
      'Your own coaching packages are priced separately through your public profile.',
    ctaLabel: 'Start Coach Pro',
    ctaLoading: 'Redirecting…',
    moreComing:
      'More coming based on coach feedback — tell us what you need most at support@treno.app.',
  },

  faq: {
    items: [
      {
        q: 'Can I find a coach on the Free plan?',
        a: 'Yes. You can browse every coach, compare their offers, and send a contact request on any plan, including Free.',
      },
      {
        q: 'What do I get when I upgrade?',
        a: 'More of your own plan to see, more AI regeneration, and the tracking features (cardio, supplements, meal alternatives) that Free keeps limited.',
      },
      {
        q: 'Why is there only one coach plan?',
        a: 'Because it covers what a coach actually needs to run their clients. We would rather keep it simple than split it into tiers that get in your way.',
      },
      {
        q: 'Does Coach Pro set the price I charge my clients?',
        a: 'No. Coach Pro is what you pay to use Treno. You decide what to charge your own clients, and you can list those prices on your public profile.',
      },
    ],
  },

  finalCta: {
    eyebrow: 'Ready to start?',
    title: 'Create your account.',
    subtitle:
      'Join as an individual if you want self-serve plans, or as a coach if you want to run your clients in one place.',
    primaryCta: 'Create account',
    secondaryCta: 'Read the FAQ',
  },
} as const
