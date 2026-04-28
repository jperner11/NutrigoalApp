import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import { brandColors, brandShadow } from '../../src/theme/brand'

export default function AIScreen() {
  const { profile } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSuggest = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResponse('')

    // Call the web app's API route for AI suggestions
    // For now, use Supabase Edge Functions or the web API
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/ai/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ prompt, profile }),
      })

      if (!res.ok) {
        const err = await res.json()
        Alert.alert('Error', err.error || 'Failed to get suggestion')
      } else {
        const data = await res.json()
        setResponse(data.suggestion)
      }
    } catch {
      Alert.alert('Error', 'Could not connect to AI service')
    }

    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Suggestions</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Ionicons name="sparkles" size={24} color={brandColors.brand500} />
          <Text style={styles.cardText}>
            Ask for meal ideas, nutrition advice, or workout suggestions tailored to your goals.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="e.g., Suggest a high-protein breakfast under 400 calories"
          placeholderTextColor={brandColors.textSubtle}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSuggest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Suggestion</Text>
          )}
        </TouchableOpacity>

        {response ? (
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  content: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: brandColors.brand100, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: brandColors.accentLine },
  cardText: { flex: 1, fontSize: 14, color: brandColors.textMuted, lineHeight: 20 },
  input: { backgroundColor: brandColors.panel, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 18, padding: 16, fontSize: 16, color: brandColors.foreground, minHeight: 96, textAlignVertical: 'top', marginBottom: 12 },
  button: { backgroundColor: brandColors.brand500, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  responseCard: { backgroundColor: brandColors.panel, borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginTop: 16, ...brandShadow },
  responseText: { fontSize: 15, color: brandColors.foregroundSoft, lineHeight: 22 },
})
