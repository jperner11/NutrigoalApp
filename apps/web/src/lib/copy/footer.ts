export const footerCopy = {
  tagline:
    'One fitness app for athletes and the coaches who train them.',
  columns: [
    {
      heading: 'App',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Find a coach', href: '/find-coach' },
        { label: 'Pricing', href: '/pricing' },
      ],
    },
    {
      heading: 'For coaches',
      links: [
        { label: 'Overview', href: '/for-coaches' },
        { label: 'How it works', href: '/how-it-works' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'FAQ', href: '/faq' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Health disclaimer', href: '/health-disclaimer' },
      ],
    },
  ],
  legal: '© 2026 TRENO · BR / UK',
  version: 'v0.9 · OPEN BETA',
} as const
