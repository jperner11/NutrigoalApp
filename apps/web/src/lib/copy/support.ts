import { SUPPORT_EMAIL } from '@/lib/site'

export const supportCopy = {
  shell: {
    eyebrow: 'Support',
    title: 'How to get help',
    intro:
      'If something is broken, unclear, or blocking you, we want to hear about it. We respond same-day where we can.',
  },

  routes: [
    {
      label: 'Best for',
      body: 'Broken flows, invite or sign-in problems, account questions, and anything that feels unclear or wrong.',
    },
    {
      label: 'Fastest route',
      body: 'Use the in-app support form if you are signed in. It gives us the context we need to help quickly.',
    },
    {
      label: 'Fallback',
      body: 'Email support directly if you cannot log in. Include your role and device.',
    },
  ],

  contact: {
    title: 'Contact us',
    bodyBefore: 'Send bug reports, account issues, trainer-client linking problems, and general feedback to ',
    bodyAfter: '.',
    email: SUPPORT_EMAIL,
    mailtoSubject: 'Meal & Motion support',
    primaryCta: 'Email support',
    secondaryCta: 'Read the FAQ',
  },

  include: {
    title: 'What to include',
    items: [
      'Whether you are a Personal Trainer, individual, or client',
      'Whether the issue happened on web or mobile',
      'The exact step you were trying to complete',
      'What you expected to happen',
      'What actually happened instead',
      'A screenshot or screen recording if you can share one',
    ],
  },

  helpWith: {
    title: 'What we can help with',
    items: [
      {
        title: 'Sign-in, invites, and accounts',
        body: 'Invite links, sign-in problems, invite acceptance, and trainer-client connection issues.',
      },
      {
        title: 'Plans and coaching',
        body: 'Missing plans, trainer assignment problems, client visibility issues, and anything blocking the coaching flow.',
      },
      {
        title: 'Bugs and usability',
        body: 'Broken buttons, wrong data, layout issues, and places where the app feels unclear or unsafe.',
      },
    ],
  },
} as const
