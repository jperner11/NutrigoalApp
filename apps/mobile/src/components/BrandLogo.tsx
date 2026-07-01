import { StyleSheet, Text, View } from 'react-native'
import { useBrandColors } from '../theme/brand'

interface BrandLogoProps {
  compact?: boolean
  light?: boolean
  tagline?: boolean
  size?: number
}

export function BrandLogo({
  compact = false,
  light = false,
  tagline = false,
  size = 28,
}: BrandLogoProps) {
  const colors = useBrandColors()
  const wordColor = light ? '#ffffff' : colors.foreground
  const tagColor = light ? 'rgba(255,255,255,0.74)' : colors.textSubtle
  const markSize = Math.max(30, Math.round(size * 1.18))

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius: Math.round(markSize * 0.25),
            backgroundColor: colors.brand500,
          },
        ]}
      >
        <View style={[styles.markTop, { top: markSize * 0.3, left: markSize * 0.25, right: markSize * 0.25 }]} />
        <View style={[styles.markStem, { top: markSize * 0.3, bottom: markSize * 0.25 }]} />
        <View style={[styles.markBase, { bottom: markSize * 0.22, left: markSize * 0.28, width: markSize * 0.44 }]} />
      </View>

      {!compact && (
        <View style={styles.copy}>
          <Text
            style={[
              styles.wordmark,
              {
                color: wordColor,
                fontSize: Math.round(size * 0.95),
                lineHeight: Math.round(size * 1.02),
              },
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
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    position: 'relative',
    flexShrink: 0,
  },
  markTop: {
    position: 'absolute',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
  },
  markStem: {
    position: 'absolute',
    left: '50%',
    width: 5,
    marginLeft: -2.5,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
  },
  markBase: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
    transform: [{ rotate: '-10deg' }],
  },
  copy: {
    flexShrink: 1,
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: 0,
  },
  tagline: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
})
