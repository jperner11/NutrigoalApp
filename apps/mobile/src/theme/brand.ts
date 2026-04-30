// Treno mobile theme — dual-mode tokens
// - Dark mode: graphite + bone + acid lime (matches web dark palette)
// - Light mode: white + black + acid lime (matches web light palette)
// - Acid lime accent (#cdf24e) is shared across modes
//
// React Native StyleSheets are evaluated once at module load, so for parity
// with the web theme we expose both palettes plus a `useBrandColors()` hook
// for components that want runtime theme switching, while `brandColors`
// remains a stable export for existing call sites (currently graphite/dark).

import { useColorScheme } from 'react-native'

const ACID_LIME_500 = '#cdf24e'
const ACID_LIME_400 = '#d6ff4e'
const ACID_LIME_700 = '#8fb31a'
const ACID_LIME_800 = '#6b8c0a'
const ACID_LIME_900 = '#4d6800'

// ─── Dark palette — graphite + bone + acid lime ────────
export const darkBrandColors = {
  background: '#0e1116',
  backgroundElevated: '#171b22',
  panel: '#171b22',
  panelMuted: 'rgba(245, 247, 250, 0.06)',
  surfaceStrong: '#1f242c',
  foreground: '#f5f7fa',
  foregroundSoft: '#e6eaf0',
  textMuted: '#c9cdd3',
  textSubtle: '#8a8f97',
  line: 'rgba(245, 247, 250, 0.10)',
  lineStrong: 'rgba(245, 247, 250, 0.20)',
  brand900: ACID_LIME_900,
  brand800: ACID_LIME_800,
  brand700: ACID_LIME_700,
  brand500: ACID_LIME_500,
  brand400: ACID_LIME_400,
  brand200: 'rgba(205, 242, 78, 0.28)',
  brand100: 'rgba(205, 242, 78, 0.12)',
  accentLine: 'rgba(205, 242, 78, 0.38)',
  // Accent text (lime fills want black text for contrast)
  onAccent: '#0a0a0a',
  success: '#1aa37a',
  successBg: 'rgba(26, 163, 122, 0.14)',
  // "danger" historically meant the brand red. Map it to the acid lime
  // accent for parity with the web rebrand (which dropped the ember palette
  // and routes brand-coloured affordances to the lime accent).
  danger: ACID_LIME_500,
  dangerBg: 'rgba(205, 242, 78, 0.14)',
  warning: '#df9a2b',
  warningBg: 'rgba(223, 154, 43, 0.14)',
}

// ─── Light palette — white + black + acid lime ─────────
export const lightBrandColors = {
  background: '#ffffff',
  backgroundElevated: '#f7f8f7',
  panel: '#ffffff',
  panelMuted: 'rgba(10, 10, 10, 0.04)',
  surfaceStrong: '#f1f3f1',
  foreground: '#0a0a0a',
  foregroundSoft: '#1a1a1a',
  textMuted: '#3a3a3a',
  textSubtle: '#6b6b6b',
  line: 'rgba(10, 10, 10, 0.10)',
  lineStrong: 'rgba(10, 10, 10, 0.18)',
  brand900: ACID_LIME_900,
  brand800: ACID_LIME_800,
  brand700: ACID_LIME_700,
  brand500: ACID_LIME_500,
  brand400: ACID_LIME_400,
  brand200: 'rgba(205, 242, 78, 0.32)',
  brand100: 'rgba(205, 242, 78, 0.16)',
  accentLine: 'rgba(205, 242, 78, 0.45)',
  onAccent: '#0a0a0a',
  success: '#1aa37a',
  successBg: 'rgba(26, 163, 122, 0.12)',
  danger: ACID_LIME_500,
  dangerBg: 'rgba(205, 242, 78, 0.18)',
  warning: '#c4791c',
  warningBg: 'rgba(196, 121, 28, 0.14)',
}

export type BrandColors = typeof darkBrandColors

/**
 * Default static palette — graphite (dark). Existing StyleSheet.create call
 * sites import this; they will continue to render the dark sequence.
 * For new components that want to follow the device theme, use
 * `useBrandColors()` instead.
 */
export const brandColors: BrandColors = darkBrandColors

export function useBrandColors(): BrandColors {
  const scheme = useColorScheme()
  return scheme === 'light' ? lightBrandColors : darkBrandColors
}

export const brandShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const
