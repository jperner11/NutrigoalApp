import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { brandColors } from '../src/theme/brand'
import { requiresOnboardingQuestionnaire } from '@nutrigoal/shared'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
})

Sentry.init({
  dsn: 'https://07d2c186c5093ff824617f3391f0f668@o4511299488382976.ingest.de.sentry.io/4511299508568144',
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__,
  tracesSampleRate: 0.1,
  release: Constants.expoConfig?.version,
  integrations: [navigationIntegration],
})

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

function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <StatusBar style="light" backgroundColor={brandColors.background} />
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

export default Sentry.wrap(RootLayout)
