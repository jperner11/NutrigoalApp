import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { brandColors } from '../src/theme/brand'
import { requiresOnboardingQuestionnaire } from '@nutrigoal/shared'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      if (profile && requiresOnboardingQuestionnaire(profile.role) && !profile.onboarding_completed) {
        router.replace('/(tabs)/onboarding')
      } else {
        router.replace('/(tabs)')
      }
    }
  }, [session, loading, segments])

  if (loading) return null

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <StatusBar style="dark" backgroundColor={brandColors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: brandColors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </AuthProvider>
  )
}
