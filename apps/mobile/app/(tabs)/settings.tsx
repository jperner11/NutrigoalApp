import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, TextInput, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { PRICING } from '@nutrigoal/shared'
import { BrandLogo } from '../../src/components/BrandLogo'
import { brandColors, brandShadow } from '../../src/theme/brand'
import { supabase } from '../../src/lib/supabase'

const SUPPORT_EMAIL = 'support@mealandmotion.app'

export default function SettingsScreen() {
  const { profile, signOut } = useAuth()
  const tier = profile?.role ?? 'free'
  const tierInfo = PRICING[tier as keyof typeof PRICING]
  const [supportCategory, setSupportCategory] = useState<'bug' | 'invite' | 'billing' | 'feedback'>('bug')
  const [supportSubject, setSupportSubject] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)
  const [supportHistory, setSupportHistory] = useState<Array<{
    id: string
    category: string
    subject: string
    status: 'open' | 'in_progress' | 'resolved'
    created_at: string
  }>>([])
  const [loadingSupportHistory, setLoadingSupportHistory] = useState(false)

  useEffect(() => {
    async function loadSupportHistory() {
      if (!profile) return
      setLoadingSupportHistory(true)
      const { data } = await supabase
        .from('support_requests')
        .select('id, category, subject, status, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setSupportHistory(data ?? [])
      setLoadingSupportHistory(false)
    }

    loadSupportHistory()
  }, [profile])

  const openSupportEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=mealandmotion%20beta%20support`)
  }

  const submitSupportRequest = async () => {
    if (!profile || !supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing details', 'Please add a subject and message.')
      return
    }

    setSubmittingSupport(true)
    const { error } = await supabase.from('support_requests').insert({
      user_id: profile.id,
      email: profile.email,
      account_role: profile.role,
      platform: 'mobile',
      category: supportCategory,
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
    })
    setSubmittingSupport(false)

    if (error) {
      Alert.alert('Error', 'Failed to submit support request.')
      return
    }

    setSupportCategory('bug')
    setSupportSubject('')
    setSupportMessage('')
    setSupportHistory((prev) => [
      {
        id: `${Date.now()}`,
        category: supportCategory,
        subject: supportSubject.trim(),
        status: 'open' as const,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 5))
    Alert.alert('Sent', 'Your beta support request has been submitted.')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandLogo compact />
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={brandColors.brand500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierInfo?.name || 'Free'}</Text>
          </View>
        </View>

        {/* Stats */}
        {profile?.daily_calories && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Targets</Text>
            <View style={styles.statRow}>
              <StatItem label="Calories" value={`${profile.daily_calories}`} />
              <StatItem label="Protein" value={`${profile.daily_protein}g`} />
              <StatItem label="Water" value={`${((profile.daily_water_ml ?? 0) / 1000).toFixed(1)}L`} />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Beta Support</Text>
          <Text style={styles.cardBody}>
            If something breaks, feels unclear, or blocks your coaching workflow, contact support directly during the beta.
          </Text>
          <View style={styles.supportCategoryRow}>
            {[
              ['bug', 'Bug'],
              ['invite', 'Invite'],
              ['billing', 'Billing'],
              ['feedback', 'Feedback'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.categoryChip, supportCategory === value && styles.categoryChipActive]}
                onPress={() => setSupportCategory(value as 'bug' | 'invite' | 'billing' | 'feedback')}
              >
                <Text style={[styles.categoryChipText, supportCategory === value && styles.categoryChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.supportInput}
            value={supportSubject}
            onChangeText={setSupportSubject}
            placeholder="Short summary"
            placeholderTextColor={brandColors.textSubtle}
          />
          <TextInput
            style={[styles.supportInput, styles.supportTextarea]}
            value={supportMessage}
            onChangeText={setSupportMessage}
            placeholder="What happened, what you expected, and how we can reproduce it"
            placeholderTextColor={brandColors.textSubtle}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={[styles.supportBtn, submittingSupport && { opacity: 0.6 }]} onPress={submitSupportRequest} disabled={submittingSupport}>
            {submittingSupport ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.supportBtnText}>Submit report</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportBtn} onPress={openSupportEmail}>
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.supportBtnText}>Email support</Text>
          </TouchableOpacity>
          <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent support requests</Text>
          <Text style={styles.cardBody}>
            Track the latest issues and beta feedback you have already sent to the team.
          </Text>
          {loadingSupportHistory ? (
            <Text style={styles.supportHistoryEmpty}>Loading support history...</Text>
          ) : supportHistory.length === 0 ? (
            <Text style={styles.supportHistoryEmpty}>No support requests submitted yet.</Text>
          ) : (
            <View style={styles.supportHistoryList}>
              {supportHistory.map((request) => (
                <View key={request.id} style={styles.supportHistoryItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supportHistorySubject}>{request.subject}</Text>
                    <Text style={styles.supportHistoryMeta}>
                      {request.category} · {new Date(request.created_at).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                  <View style={[styles.supportStatusBadge, supportStatusStyles[request.status]]}>
                    <Text style={styles.supportStatusText}>{request.status.replace('_', ' ')}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={brandColors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  content: { padding: 20, paddingTop: 0 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: brandColors.panel, borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 16, ...brandShadow },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: brandColors.brand100, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  email: { fontSize: 13, color: brandColors.textMuted, marginTop: 2 },
  tierBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontSize: 12, fontWeight: '700', color: brandColors.brand500 },
  card: { backgroundColor: brandColors.panel, borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 16, ...brandShadow },
  cardTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft, marginBottom: 12 },
  cardBody: { fontSize: 14, lineHeight: 22, color: brandColors.textMuted },
  supportCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  categoryChip: { borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: brandColors.panelMuted },
  categoryChipActive: { backgroundColor: brandColors.brand100, borderColor: brandColors.brand500 },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: brandColors.textMuted },
  categoryChipTextActive: { color: brandColors.brand500 },
  supportInput: { marginTop: 12, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 14, backgroundColor: brandColors.panel, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: brandColors.foregroundSoft },
  supportTextarea: { minHeight: 110, paddingTop: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: brandColors.brand500 },
  statLabel: { fontSize: 12, color: brandColors.textMuted, marginTop: 2 },
  supportBtn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brandColors.brand500, borderRadius: 14, paddingVertical: 14 },
  supportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  supportEmail: { marginTop: 10, fontSize: 12, color: brandColors.textSubtle, textAlign: 'center' },
  supportHistoryList: { marginTop: 14, gap: 10 },
  supportHistoryItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, backgroundColor: brandColors.panelMuted, padding: 12 },
  supportHistorySubject: { fontSize: 14, fontWeight: '700', color: brandColors.foregroundSoft },
  supportHistoryMeta: { marginTop: 4, fontSize: 12, color: brandColors.textMuted, textTransform: 'capitalize' },
  supportHistoryEmpty: { marginTop: 14, fontSize: 13, color: brandColors.textMuted },
  supportStatusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  supportStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 16 },
  signOutText: { fontSize: 16, fontWeight: '600', color: brandColors.danger },
})

const supportStatusStyles = StyleSheet.create({
  open: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  in_progress: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  resolved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
})
