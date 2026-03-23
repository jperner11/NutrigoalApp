import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

function getStorage() {
  if (Platform.OS !== 'web') {
    const SecureStore = require('expo-secure-store')
    return {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }
  }

  // Web: use localStorage if available (browser), otherwise no-op (SSR)
  const isClient = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  return {
    getItem: (key: string) => Promise.resolve(isClient ? window.localStorage.getItem(key) : null),
    setItem: (key: string, value: string) => { if (isClient) window.localStorage.setItem(key, value); return Promise.resolve() },
    removeItem: (key: string) => { if (isClient) window.localStorage.removeItem(key); return Promise.resolve() },
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
