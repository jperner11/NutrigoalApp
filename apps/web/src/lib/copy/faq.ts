import { SUPPORT_EMAIL } from '@/lib/site'

export const faqCopy = {
  shell: {
    eyebrow: 'FAQ',
    title: 'Answers before you sign up',
    intro:
      'Who Treno is for, how individuals and coaches use it, how the marketplace works, and where to get help.',
  },

  quickCards: [
    {
      label: 'Coaches',
      body: 'Best on web. Run your roster, client invites, plans, messaging, and feedback.',
    },
    {
      label: 'Individuals',
      body: 'Best on mobile. Follow your plan, log progress, and find a coach when you want one.',
    },
    {
      label: 'Marketplace',
      body: 'Browse Personal Trainers, compare offers, and contact a coach on any plan.',
    },
  ],

  sections: [
    {
      title: 'About',
      items: [
        {
          q: 'Who is Treno for?',
          a: 'Three audiences: individuals who want an AI-built meal and training plan, Personal Trainers who want one app to run their clients, and anyone looking for a coach to work with.',
        },
        {
          q: 'Is it a fitness app or a coaching app?',
          a: 'Both. You can use it on your own with AI-built plans, or work with a Personal Trainer. Coaches use it to run their whole client roster.',
        },
        {
          q: 'What makes it different?',
          a: 'Meal plans, training plans, progress tracking, check-ins, and coach discovery are all in one app. You do not have to stitch three tools together to get the full picture.',
        },
      ],
    },
    {
      title: 'For Personal Trainers',
      items: [
        {
          q: 'Should I use web or mobile as a trainer?',
          a: 'Web is the recommended place for running your clients: roster, invites, plans, messaging, and feedback. Mobile works too, but web is faster for day-to-day coaching.',
        },
        {
          q: 'How do I invite a client?',
          a: 'Send an invite by email from the Clients area. The invite stays pending until the client accepts. If they already have an account, they still have to approve the coaching relationship before anything is linked.',
        },
        {
          q: 'Will people be able to find me inside the app?',
          a: 'Yes. Coaches can publish a public profile with their specialties, style, and prices. Individuals browsing for a coach can find you and send a contact request.',
        },
        {
          q: 'What happens after a client accepts my invite?',
          a: 'They become active in your roster. From there you can assign meal and training plans, message them, request feedback, and review their progress. If you have not assigned anything yet, they see a clear waiting state.',
        },
        {
          q: 'Can one client have two trainers?',
          a: 'No. One active trainer per client. If someone is already working with another trainer, they have to end that relationship before starting a new one.',
        },
      ],
    },
    {
      title: 'For clients',
      items: [
        {
          q: 'If my trainer invited me, can I still build my own plan?',
          a: 'No. If you are working with a trainer, you follow the plans they assign. This keeps the coaching relationship clean and avoids accidentally running two plans at once.',
        },
        {
          q: 'Should I use the app on my phone or on web?',
          a: 'Use the phone app day to day — for following your plan, logging meals and workouts, tracking progress, and messaging your trainer. Web works too as a backup.',
        },
        {
          q: 'I accepted my invite but I do not see a plan. What now?',
          a: 'Your trainer still needs to assign it. You will see a clear connected state that tells you the relationship is active and the plan is coming.',
        },
      ],
    },
    {
      title: 'Pricing',
      items: [
        {
          q: 'Can I find a coach on the Free plan?',
          a: 'Yes. Browsing coaches and sending contact requests is available on every plan, including Free.',
        },
        {
          q: 'What do I get when I upgrade?',
          a: 'More of your own plan to see, more AI regeneration, and the tracking features (cardio, supplements, meal alternatives) that Free keeps limited.',
        },
        {
          q: 'Is there more than one coach plan?',
          a: 'No. One plan, everything included, one price. It covers client delivery, messaging, feedback, progress tracking, and your public profile.',
        },
      ],
    },
    {
      title: 'AI and safety',
      items: [
        {
          q: 'Do I have to use AI?',
          a: 'No. AI helps build plans and suggestions, but the core workflow — trainer-client coaching, plan delivery, messaging, progress — works without it.',
        },
        {
          q: 'Is this medical advice?',
          a: 'No. Treno supports training, nutrition, and coaching. It is not a medical device and does not provide diagnosis or treatment. For injuries, medical conditions, eating disorders, pregnancy, or anything needing clinical supervision, speak to a qualified medical professional.',
        },
        {
          q: 'How is my data handled?',
          a: 'We process account, coaching, and progress data to run the service. If you work with a trainer, they see the coaching-related data you share with them. See the Privacy Policy and Terms for detail. Contact support for deletion or account questions.',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          q: 'How do I get help?',
          a: `Use the in-app support form if you are signed in, or email ${SUPPORT_EMAIL} if you cannot log in. Include your role, your device, and the steps that led to the problem — it helps us fix it faster.`,
        },
      ],
    },
  ],

  stillUnsure: {
    title: 'Still unsure?',
    body:
      'The fastest way to know if Treno fits is to create an account and try the side of the app that matches you — individual, coach, or client looking for a coach.',
    primaryCta: 'Visit support',
    secondaryCta: 'Create account',
  },
} as const
