import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import type { Message, FeedbackRequest, FeedbackQuestion } from '@nutrigoal/shared'
import { brandColors, brandShadow } from '../../src/theme/brand'

type Screen = 'home' | 'messages' | 'feedback-list' | 'feedback-respond'

export default function MyPTScreen() {
  const { user } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [ptName, setPtName] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)

  const loadData = useCallback(async () => {
    if (!user) return

    // Find if user has a PT
    const { data: clientRow } = await supabase
      .from('nutritionist_clients')
      .select('nutritionist_id, user_profiles!nutritionist_clients_nutritionist_id_fkey(full_name)')
      .eq('client_id', user.id)
      .eq('status', 'active')
      .single()

    if (!clientRow) { setLoading(false); return }

    const ptProfile = (clientRow as any).user_profiles
    setPtName(ptProfile?.full_name || 'Your PT')

    // Get conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('nutritionist_id', clientRow.nutritionist_id)
      .eq('client_id', user.id)
      .single()

    if (conv) {
      setConversationId(conv.id)
      // Count unread messages
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .is('read_at', null)
      setUnreadCount(count || 0)
    }

    // Get feedback requests
    const { data: fb } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    if (fb) {
      setFeedbackRequests(fb as FeedbackRequest[])
      setPendingFeedbackCount(fb.filter(f => f.status === 'pending').length)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  if (screen === 'messages' && conversationId) {
    return <ChatScreen conversationId={conversationId} user={user} ptName={ptName || 'PT'}
      onBack={() => { setScreen('home'); loadData() }} />
  }
  if (screen === 'feedback-list') {
    return <FeedbackListScreen requests={feedbackRequests} onBack={() => setScreen('home')}
      onSelect={(fb) => { setSelectedFeedback(fb); setScreen('feedback-respond') }} />
  }
  if (screen === 'feedback-respond' && selectedFeedback) {
    return <FeedbackRespondScreen feedback={selectedFeedback} user={user}
      onBack={() => { setScreen('feedback-list'); loadData() }} />
  }

  if (loading) return (
    <SafeAreaView style={s.container}>
      <ActivityIndicator style={{ marginTop: 40 }} />
    </SafeAreaView>
  )

  if (!ptName) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><Text style={s.title}>My PT</Text></View>
      <View style={s.empty}>
        <Ionicons name="person-outline" size={48} color={brandColors.textSubtle} />
        <Text style={s.emptyText}>No PT assigned</Text>
        <Text style={s.emptyHint}>Ask your PT or nutritionist to invite you.</Text>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>My PT</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {/* PT Card */}
        <View style={s.ptCard}>
          <View style={s.ptAvatar}>
            <Text style={s.ptAvatarText}>{ptName[0].toUpperCase()}</Text>
          </View>
          <Text style={s.ptName}>{ptName}</Text>
          <Text style={s.ptLabel}>Your Personal Trainer / Nutritionist</Text>
        </View>

        {/* Action Cards */}
        <TouchableOpacity style={s.actionCard} onPress={() => setScreen('messages')}>
          <View style={[s.actionIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="chatbubbles" size={24} color={brandColors.brand500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Messages</Text>
            <Text style={s.actionSub}>Chat with your PT</Text>
          </View>
          {unreadCount > 0 && (
            <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionCard} onPress={() => setScreen('feedback-list')}>
          <View style={[s.actionIcon, { backgroundColor: '#f5f3ff' }]}>
            <Ionicons name="clipboard" size={24} color={brandColors.brand500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Feedback Requests</Text>
            <Text style={s.actionSub}>{pendingFeedbackCount > 0 ? `${pendingFeedbackCount} pending` : 'All caught up'}</Text>
          </View>
          {pendingFeedbackCount > 0 && (
            <View style={[s.badge, { backgroundColor: brandColors.brand500 }]}><Text style={s.badgeText}>{pendingFeedbackCount}</Text></View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Chat Screen ─────────────────────────────────────────
function ChatScreen({ conversationId, user, ptName, onBack }: {
  conversationId: string; user: any; ptName: string; onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Fetch messages
    supabase.from('messages').select('*').eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as Message[]) })

    // Mark as read
    supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId).neq('sender_id', user.id).is('read_at', null)

    // Realtime
    const channel = supabase
      .channel(`client-msg:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, user.id])

  const handleSend = async () => {
    if (!text.trim() || !user) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: conversationId, sender_id: user.id, content: text.trim(),
    })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
    setText('')
    setSending(false)
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color={brandColors.foregroundSoft} /></TouchableOpacity>
        <Text style={s.chatTitle}>{ptName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id
          return (
            <View style={[s.msgBubble, isMe ? s.msgMe : s.msgThem]}>
              <Text style={[s.msgText, isMe && { color: '#fff' }]}>{item.content}</Text>
              <Text style={[s.msgTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )
        }}
      />

      <View style={s.inputBar}>
        <TextInput style={s.msgInput} value={text} onChangeText={setText}
          placeholder="Type a message..." placeholderTextColor={brandColors.textSubtle} multiline />
        <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending || !text.trim()}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── Feedback List ───────────────────────────────────────
function FeedbackListScreen({ requests, onBack, onSelect }: {
  requests: FeedbackRequest[]; onBack: () => void; onSelect: (fb: FeedbackRequest) => void
}) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color={brandColors.foregroundSoft} /></TouchableOpacity>
        <Text style={s.chatTitle}>Feedback Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {requests.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="clipboard-outline" size={48} color={brandColors.textSubtle} />
            <Text style={s.emptyText}>No feedback requests</Text>
          </View>
        ) : requests.map(fb => (
          <TouchableOpacity key={fb.id} style={s.fbCard} onPress={() => onSelect(fb)}>
            <View style={{ flex: 1 }}>
              <Text style={s.fbTitle}>{fb.title}</Text>
              <Text style={s.fbDate}>{new Date(fb.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={[s.fbBadge, fb.status === 'completed' && s.fbBadgeDone]}>
              <Text style={[s.fbBadgeText, fb.status === 'completed' && s.fbBadgeTextDone]}>
                {fb.status === 'completed' ? 'Completed' : 'Pending'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Feedback Respond ────────────────────────────────────
function FeedbackRespondScreen({ feedback, user, onBack }: {
  feedback: FeedbackRequest; user: any; onBack: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({})
  const [saving, setSaving] = useState(false)
  const isCompleted = feedback.status === 'completed'

  const updateAnswer = (qId: string, value: string | number | boolean) => {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async () => {
    const responses = feedback.questions.map((q: FeedbackQuestion) => ({
      question_id: q.id,
      answer: answers[q.id] ?? '',
    }))

    setSaving(true)
    const { error } = await supabase.from('feedback_requests').update({
      responses, status: 'completed', responded_at: new Date().toISOString(),
    }).eq('id', feedback.id)

    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Sent!', 'Your feedback has been submitted.')
    onBack()
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color={brandColors.foregroundSoft} /></TouchableOpacity>
        <Text style={s.chatTitle}>{feedback.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {feedback.questions.map((q: FeedbackQuestion, i: number) => {
          const existingAnswer = isCompleted && feedback.responses
            ? (feedback.responses as any)[i]?.answer
            : undefined

          return (
            <View key={q.id} style={s.questionCard}>
              <Text style={s.questionText}>{q.question}</Text>
              <Text style={s.questionType}>
                {q.type === 'text' ? 'Text answer' : q.type === 'rating' ? 'Rating (1-5)' : 'Yes / No'}
              </Text>

              {isCompleted ? (
                <View style={s.answerBox}>
                  <Text style={s.answerText}>{String(existingAnswer ?? '—')}</Text>
                </View>
              ) : q.type === 'text' ? (
                <TextInput style={s.answerInput} multiline
                  placeholder="Type your answer..." placeholderTextColor={brandColors.textSubtle}
                  value={String(answers[q.id] ?? '')}
                  onChangeText={(t) => updateAnswer(q.id, t)} />
              ) : q.type === 'rating' ? (
                <View style={s.ratingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} style={[s.ratingBtn, answers[q.id] === n && s.ratingBtnActive]}
                      onPress={() => updateAnswer(q.id, n)}>
                      <Text style={[s.ratingText, answers[q.id] === n && s.ratingTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={s.yesNoRow}>
                  <TouchableOpacity style={[s.yesNoBtn, answers[q.id] === true && s.yesNoBtnActive]}
                    onPress={() => updateAnswer(q.id, true)}>
                    <Text style={[s.yesNoText, answers[q.id] === true && s.yesNoTextActive]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.yesNoBtn, answers[q.id] === false && s.yesNoBtnActive]}
                    onPress={() => updateAnswer(q.id, false)}>
                    <Text style={[s.yesNoText, answers[q.id] === false && s.yesNoTextActive]}>No</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}

        {!isCompleted && (
          <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Feedback</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  content: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: brandColors.textMuted },
  emptyHint: { fontSize: 14, color: brandColors.textSubtle, textAlign: 'center' },
  // PT card
  ptCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 24, borderWidth: 1, borderColor: brandColors.line, padding: 24, alignItems: 'center', marginBottom: 20, ...brandShadow },
  ptAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: brandColors.brand100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ptAvatarText: { fontSize: 28, fontWeight: '700', color: brandColors.brand500 },
  ptName: { fontSize: 22, fontWeight: '800', color: brandColors.foreground },
  ptLabel: { fontSize: 13, color: brandColors.textSubtle, marginTop: 4 },
  // Action cards
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 10, ...brandShadow },
  actionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  actionSub: { fontSize: 13, color: brandColors.textSubtle, marginTop: 2 },
  badge: { backgroundColor: brandColors.brand500, borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  chatTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  msgBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  msgMe: { backgroundColor: brandColors.brand900, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgThem: { backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: brandColors.line },
  msgText: { fontSize: 15, color: brandColors.foregroundSoft, lineHeight: 20 },
  msgTime: { fontSize: 10, color: brandColors.textSubtle, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: brandColors.line, backgroundColor: 'rgba(255,255,255,0.92)' },
  msgInput: { flex: 1, backgroundColor: brandColors.panelMuted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: brandColors.foreground, maxHeight: 100 },
  sendBtn: { backgroundColor: brandColors.brand900, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // Feedback list
  fbCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 8, ...brandShadow },
  fbTitle: { fontSize: 16, fontWeight: '600', color: brandColors.foregroundSoft },
  fbDate: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  fbBadge: { backgroundColor: '#fff3d9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fbBadgeDone: { backgroundColor: brandColors.brand100 },
  fbBadgeText: { fontSize: 11, fontWeight: '600', color: brandColors.warning },
  fbBadgeTextDone: { color: brandColors.brand500 },
  // Feedback respond
  questionCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 12, ...brandShadow },
  questionText: { fontSize: 16, fontWeight: '600', color: brandColors.foregroundSoft, marginBottom: 4 },
  questionType: { fontSize: 12, color: brandColors.textSubtle, marginBottom: 12 },
  answerInput: { backgroundColor: brandColors.panelMuted, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 12, padding: 12, fontSize: 15, color: brandColors.foreground, minHeight: 60, textAlignVertical: 'top' },
  answerBox: { backgroundColor: brandColors.panelMuted, borderRadius: 12, padding: 12 },
  answerText: { fontSize: 15, color: brandColors.foregroundSoft },
  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: brandColors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
  ratingBtnActive: { backgroundColor: brandColors.brand900, borderColor: brandColors.brand900 },
  ratingText: { fontSize: 18, fontWeight: '700', color: brandColors.textSubtle },
  ratingTextActive: { color: '#fff' },
  yesNoRow: { flexDirection: 'row', gap: 12 },
  yesNoBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: brandColors.lineStrong, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
  yesNoBtnActive: { backgroundColor: brandColors.brand900, borderColor: brandColors.brand900 },
  yesNoText: { fontSize: 16, fontWeight: '600', color: brandColors.textSubtle },
  yesNoTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: brandColors.brand900, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
