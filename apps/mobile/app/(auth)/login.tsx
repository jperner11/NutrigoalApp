import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      Alert.alert('Login Failed', error.message)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.topGlow} />
      <View style={styles.sideGlow} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={styles.header}>
            <BrandLogo />
            <View style={styles.eyebrow}>
              <Text style={styles.eyebrowText}>Member sign in</Text>
            </View>
            <Text style={styles.title}>Built for focused nutrition and training plans.</Text>
            <Text style={styles.subtitle}>
              Pick up your programme, track today, and keep the clinic view with you on mobile.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={brandColors.textSubtle}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={brandColors.textSubtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Create one</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: brandColors.brand100,
  },
  sideGlow: {
    position: 'absolute',
    top: 140,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 241, 234, 0.04)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  header: {
    marginBottom: 28,
    gap: 14,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: brandColors.accentLine,
    backgroundColor: brandColors.brand100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  eyebrowText: {
    color: brandColors.foregroundSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: brandColors.foreground,
    letterSpacing: -1.1,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: brandColors.textMuted,
  },
  formCard: {
    borderRadius: 28,
    backgroundColor: brandColors.panel,
    borderWidth: 1,
    borderColor: brandColors.line,
    padding: 20,
    ...brandShadow,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.foregroundSoft,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: brandColors.backgroundElevated,
    borderWidth: 1,
    borderColor: brandColors.lineStrong,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: brandColors.foreground,
  },
  button: {
    backgroundColor: brandColors.brand500,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: brandColors.textMuted,
    fontSize: 14,
  },
  link: {
    color: brandColors.brand500,
    fontSize: 14,
    fontWeight: '600',
  },
})
