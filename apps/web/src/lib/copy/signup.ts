export const signupCopy = {
  nav: {
    signIn: 'Sign in',
  },

  intro: {
    eyebrow: 'Get started',
    titleLine1: 'Create your',
    titleLine2: 'account.',
    subtitle:
      'Build your own meal and training plans with AI, or run your clients in one place as a Personal Trainer.',
    highlights: [
      ['Individuals', 'Build your own meal and training plans, track progress, and find a coach.'],
      ['Coaches', 'Manage your clients, deliver their plans, and get discovered by new ones.'],
    ] as const,
  },

  form: {
    eyebrow: 'Create account',
    title: 'Choose your role',
    subtitle: 'Start as an individual or a coach.',
    roleLabel: 'I am joining as',
    roleIndividual: {
      title: 'Individual',
      body: 'Your own plans, progress tracking, and coach marketplace access.',
    },
    roleCoach: {
      title: 'Coach / Personal Trainer',
      body: 'Manage your clients and get a public profile.',
    },
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'Your full name',
    emailLabel: 'Email',
    emailPlaceholder: 'your.email@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 6 characters',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    submit: 'Create account',
    alreadyHave: 'Already have an account?',
    signInLink: 'Sign in',
  },
} as const
