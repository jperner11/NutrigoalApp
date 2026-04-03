import { StyleSheet, Text, View } from 'react-native'
import { brandColors } from '../theme/brand'

interface BrandLogoProps {
  compact?: boolean
  light?: boolean
}

export function BrandLogo({ compact = false, light = false }: BrandLogoProps) {
  const wordColor = light ? '#ffffff' : brandColors.foreground
  const tagColor = light ? 'rgba(255,255,255,0.74)' : brandColors.textMuted

  return (
    <View style={styles.row}>
      <View style={[styles.mark, light && styles.markLight]}>
        <View style={styles.ring} />
        <View style={styles.core} />
        <View style={styles.waveWrap}>
          <View style={styles.waveOne} />
          <View style={styles.waveTwo} />
          <View style={styles.waveThree} />
        </View>
      </View>
      {!compact && (
        <View style={styles.copy}>
          <Text style={[styles.wordmark, { color: wordColor }]}>Nutrigoal</Text>
          <Text style={[styles.tagline, { color: tagColor }]}>
            Performance clinic for nutrition and training
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
    backgroundColor: brandColors.brand900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markLight: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ring: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  core: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  waveWrap: {
    width: 28,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveOne: {
    width: 7,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginTop: 4,
  },
  waveTwo: {
    width: 9,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    transform: [{ rotate: '-60deg' }],
  },
  waveThree: {
    width: 9,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginTop: 6,
  },
  copy: {
    flexShrink: 1,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  tagline: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
})
