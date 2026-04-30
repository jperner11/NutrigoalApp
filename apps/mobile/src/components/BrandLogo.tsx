import { StyleSheet, Text, View } from 'react-native'
import { brandColors } from '../theme/brand'

interface BrandLogoProps {
  /** Kept for API compatibility; the simplified wordmark has no compact variant yet. */
  compact?: boolean
  light?: boolean
  tagline?: boolean
  size?: number
}

/**
 * Treno wordmark placeholder. Mirrors `apps/web/src/components/brand/BrandLogo.tsx`
 * (lowercase "treno" in the display weight) so the brand reads consistently
 * across web and mobile until a final mark lands.
 */
export function BrandLogo({
  light = false,
  tagline = false,
  size = 28,
}: BrandLogoProps) {
  const wordColor = light ? '#ffffff' : brandColors.foreground
  const tagColor = light ? 'rgba(255,255,255,0.74)' : brandColors.textSubtle

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text
          style={[
            styles.wordmark,
            { color: wordColor, fontSize: Math.round(size * 0.95) },
          ]}
        >
          treno
        </Text>
        {tagline && (
          <Text style={[styles.tagline, { color: tagColor }]}>
            ONE FITNESS APP
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flexShrink: 1,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -1.4,
    lineHeight: 28,
  },
  tagline: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
})
