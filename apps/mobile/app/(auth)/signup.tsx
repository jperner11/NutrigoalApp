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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'

export default function SignupScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'free' | 'personal_trainer'>('free')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    const signupRole = role

    if (!fullName.trim() || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: signupRole,
          full_name: fullName.trim(),
        },
      },
    })

    if (error) {
      setLoading(false)
      Alert.alert('Sign Up Failed', error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      let profileReady = false

      for (let i = 0; i < 10; i++) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (data) {
          profileReady = true
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      if (profileReady) {
        await supabase
          .from('user_profiles')
          .update({ role: signupRole, full_name: fullName.trim() })
          .eq('id', user.id)

        if (signupRole === 'personal_trainer') {
          await supabase
            .from('nutritionist_packages')
            .upsert({
              nutritionist_id: user.id,
              max_clients: 15,
            }, { onConflict: 'nutritionist_id' })
        }
      }
    }

    setLoading(false)
    Alert.alert('Check your email', 'We sent you a confirmation link to verify your account.')
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
              <Text style={styles.eyebrowText}>New patient intake</Text>
            </View>
            <Text style={styles.title}>Create your account and start the clinic setup.</Text>
            <Text style={styles.subtitle}>
              We&apos;ll use your profile to shape nutrition targets, training guidance, and coach discovery around the right path for you.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>I am joining as</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleCard, role === 'free' && styles.roleCardActive]}
                onPress={() => setRole('free')}
              >
                <Ionicons name="person-outline" size={22} color={role === 'free' ? brandColors.brand900 : brandColors.textMuted} />
                <Text style={styles.roleTitle}>Individual</Text>
                <Text style={styles.roleBody}>Self-serve progress with Discover Coaches included.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleCard, role === 'personal_trainer' && styles.roleCardActive]}
                onPress={() => setRole('personal_trainer')}
              >
                <Ionicons name="people-outline" size={22} color={role === 'personal_trainer' ? brandColors.brand900 : brandColors.textMuted} />
                <Text style={styles.roleTitle}>Coach / PT</Text>
                <Text style={styles.roleBody}>Client management, coaching, and marketplace visibility.</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={brandColors.textSubtle}
              value={fullName}
              onChangeText={setFullName}
            />

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
              placeholder="At least 6 characters"
              placeholderTextColor={brandColors.textSubtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor={brandColors.textSubtle}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign in</Text>
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
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(77, 196, 255, 0.18)',
  },
  sideGlow: {
    position: 'absolute',
    top: 180,
    right: -80,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(216, 239, 251, 0.95)',
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
    borderColor: 'rgba(77, 196, 255, 0.34)',
    backgroundColor: brandColors.brand100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  eyebrowText: {
    color: '#0f4262',
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
    backgroundColor: 'rgba(255,255,255,0.92)',
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
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  roleCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brandColors.line,
    backgroundColor: 'rgba(255,255,255,0.72)',
    padding: 14,
    gap: 6,
  },
  roleCardActive: {
    borderColor: 'rgba(29, 168, 240, 0.34)',
    backgroundColor: brandColors.brand100,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.foreground,
  },
  roleBody: {
    fontSize: 12,
    lineHeight: 17,
    color: brandColors.textMuted,
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
    backgroundColor: brandColors.brand900,
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
