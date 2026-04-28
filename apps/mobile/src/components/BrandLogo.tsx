import { StyleSheet, Text, View } from 'react-native'
import { brandColors } from '../theme/brand'

interface BrandLogoProps {
  compact?: boolean
  light?: boolean
}

export function BrandLogo({ compact = false, light = false }: BrandLogoProps) {
  const wordColor = light ? '#ffffff' : brandColors.foreground
  const tagColor = light ? 'rgba(255,255,255,0.74)' : brandColors.textMuted
  const strokeColor = light ? '#ffffff' : brandColors.foreground
  const accentColor = brandColors.brand500

  return (
    <View style={styles.row}>
      <View style={[styles.mark, light && styles.markLight]}>
        <View style={[styles.archLeft, { borderColor: strokeColor }]} />
        <View style={[styles.archRight, { borderColor: strokeColor }]} />
        <View style={[styles.plate, { borderColor: accentColor }]} />
        <View style={[styles.motionDot, { backgroundColor: accentColor }]} />
      </View>
      {!compact && (
        <View style={styles.copy}>
          <Text style={[styles.wordmark, { color: wordColor }]}>Meal & Motion</Text>
          <Text style={[styles.tagline, { color: tagColor }]}>
            feel your momentum
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: brandColors.surfaceStrong,
    borderWidth: 1,
    borderColor: brandColors.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markLight: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  archLeft: {
    position: 'absolute',
    left: 8,
    bottom: 14,
    width: 14,
    height: 18,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  archRight: {
    position: 'absolute',
    left: 21,
    bottom: 14,
    width: 16,
    height: 20,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  plate: {
    position: 'absolute',
    bottom: 10,
    width: 24,
    height: 10,
    borderWidth: 3,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  motionDot: {
    position: 'absolute',
    top: 10,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  copy: {
    flexShrink: 1,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  tagline: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
})
