import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'

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
          <Ionicons name="sparkles" size={24} color="#8b5cf6" />
          <Text style={styles.cardText}>
            Ask for meal ideas, nutrition advice, or workout suggestions tailored to your goals.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="e.g., Suggest a high-protein breakfast under 400 calories"
          placeholderTextColor="#9ca3af"
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  content: { padding: 20, paddingTop: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardText: { flex: 1, fontSize: 14, color: '#6b7280' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 16, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  button: { backgroundColor: '#8b5cf6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  responseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  responseText: { fontSize: 15, color: '#374151', lineHeight: 22 },
})
