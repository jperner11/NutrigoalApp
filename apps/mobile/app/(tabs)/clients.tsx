import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { supabase } from '../../src/lib/supabase'
import {
  BODY_PARTS, EQUIPMENT_TYPES, MEAL_TYPES,
  DEFAULT_REST_SECONDS, DEFAULT_SETS, DEFAULT_REPS,
  isTrainerRole,
} from '@nutrigoal/shared'
import type {
  NutritionistClient, UserProfile, DietPlan, TrainingPlan,
  Conversation, Message, FeedbackRequest, FeedbackQuestion,
  Exercise, FoodItem, MealType,
} from '@nutrigoal/shared'
import { brandColors, brandShadow } from '../../src/theme/brand'

const API_URL = process.env.EXPO_PUBLIC_API_URL || ''

// ─── Types ──────────────────────────────────────────────
interface ClientWithProfile extends NutritionistClient {
  profile?: UserProfile | null
}

interface PendingInvite {
  id: string
  invited_email: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'
  expires_at: string
  created_at: string
}

type Screen = 'list' | 'detail' | 'messages' | 'feedback' | 'create-diet' | 'create-training'

interface MealEntry {
  meal_type: MealType
  meal_name: string
  foods: FoodItem[]
}
interface DayEntry {
  name: string
  exercises: ExerciseEntry[]
}
interface ExerciseEntry {
  exercise: Exercise
  sets: number
  reps: string
  rest_seconds: number
}

// ─── Main Screen ────────────────────────────────────────
export default function ClientsScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('list')
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientWithProfile | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])

  const fetchClients = async () => {
    if (!user) return
    const [{ data }, { data: inviteRows }] = await Promise.all([
      supabase
        .from('nutritionist_clients')
        .select('*, user_profiles!nutritionist_clients_client_id_fkey(*)')
        .eq('nutritionist_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('personal_trainer_invites')
        .select('id, invited_email, status, expires_at, created_at')
        .eq('personal_trainer_id', user.id)
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false }),
    ])
    if (data) {
      setClients(data.map((c: any) => ({
        ...c,
        profile: c.user_profiles || null,
      })))
    }
    setPendingInvites((inviteRows as PendingInvite[]) || [])
  }

  useEffect(() => { fetchClients() }, [user])
  const onRefresh = async () => { setRefreshing(true); await fetchClients(); setRefreshing(false) }

  const handleInvite = async () => {
    if (!user || !inviteEmail.trim()) return
    if (!API_URL) {
      Alert.alert('Missing API URL', 'Set EXPO_PUBLIC_API_URL so the app can send trainer invites.')
      return
    }
    setInviting(true)

    const response = await fetch(`${API_URL}/api/personal-trainer/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
    })
    const payload = await response.json().catch(() => null)

    setInviting(false)
    if (!response.ok) {
      Alert.alert('Error', payload?.error || 'Failed to send invite.')
      return
    }

    Alert.alert('Invite sent', payload?.message || 'The client must accept before they appear as active.')
    setInviteEmail('')
    setShowInvite(false)
    await fetchClients()
  }

  const openClient = (client: ClientWithProfile) => {
    setSelectedClient(client)
    setScreen('detail')
  }

  if (screen === 'detail' && selectedClient) {
    return <ClientDetail client={selectedClient} user={user} onBack={() => { setScreen('list'); fetchClients() }}
      onMessages={() => setScreen('messages')} onFeedback={() => setScreen('feedback')}
      onCreateDiet={() => setScreen('create-diet')} onCreateTraining={() => setScreen('create-training')} />
  }
  if (screen === 'messages' && selectedClient) {
    return <MessagesScreen client={selectedClient} user={user} onBack={() => setScreen('detail')} />
  }
  if (screen === 'feedback' && selectedClient) {
    return <FeedbackScreen client={selectedClient} user={user} onBack={() => setScreen('detail')} />
  }
  if (screen === 'create-diet' && selectedClient) {
    return <CreateClientDietPlan client={selectedClient} user={user}
      onDone={() => setScreen('detail')} onCancel={() => setScreen('detail')} />
  }
  if (screen === 'create-training' && selectedClient) {
    return <CreateClientTrainingPlan client={selectedClient} user={user}
      onDone={() => setScreen('detail')} onCancel={() => setScreen('detail')} />
  }

  const activeClients = clients.filter(c => c.status === 'active')
  const pendingClients = pendingInvites

  if (profile && !isTrainerRole(profile.role)) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.empty}>
          <Ionicons name="lock-closed-outline" size={48} color={brandColors.textSubtle} />
          <Text style={st.emptyText}>Trainer access only</Text>
          <Text style={st.clientMeta}>This area is only available for personal trainer accounts.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <Text style={st.title}>Clients</Text>
        <TouchableOpacity style={st.addBtn} onPress={() => setShowInvite(true)}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.brand500} />}>
        {clients.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={st.emptyText}>No clients yet</Text>
            <TouchableOpacity onPress={() => setShowInvite(true)}>
              <Text style={st.emptyLink}>Invite your first client</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeClients.length > 0 && (
              <>
                <Text style={st.sectionTitle}>Active ({activeClients.length})</Text>
                {activeClients.map(c => (
                  <TouchableOpacity key={c.id} style={st.clientCard} onPress={() => openClient(c)}>
                    <View style={st.avatar}>
                      <Text style={st.avatarText}>{(c.profile?.full_name || c.invited_email || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.clientName}>{c.profile?.full_name || c.invited_email || 'Client'}</Text>
                      <Text style={st.clientMeta}>
                        {c.profile?.goal ? `${c.profile.goal} · ` : ''}{c.profile?.daily_calories ? `${c.profile.daily_calories} kcal` : 'No targets set'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                  </TouchableOpacity>
                ))}
              </>
            )}
            {pendingClients.length > 0 && (
              <>
                <Text style={st.sectionTitle}>Pending ({pendingClients.length})</Text>
                {pendingClients.map(c => (
                  <View key={c.id} style={[st.clientCard, { opacity: 0.7 }]}>
                    <View style={[st.avatar, { backgroundColor: '#f3f4f6' }]}>
                      <Ionicons name="hourglass-outline" size={18} color="#9ca3af" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.clientName}>{c.invited_email}</Text>
                      <Text style={st.clientMeta}>
                        {new Date(c.expires_at).getTime() < Date.now() ? 'Invite expired' : 'Awaiting acceptance'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.container}>
          <View style={st.modalHeader}>
            <TouchableOpacity onPress={() => setShowInvite(false)}><Text style={st.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={st.modalTitle}>Invite Client</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 20 }}>
            <Text style={st.label}>Client's email address</Text>
            <TextInput style={st.input} value={inviteEmail} onChangeText={setInviteEmail} placeholder="client@email.com" placeholderTextColor="#9ca3af"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Text style={st.hint}>We&apos;ll send a secure invite email. They only appear as active after they accept.</Text>
            <TouchableOpacity style={[st.primaryBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Send Invite</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Client Detail ──────────────────────────────────────
function ClientDetail({ client, user, onBack, onMessages, onFeedback, onCreateDiet, onCreateTraining }: {
  client: ClientWithProfile; user: any; onBack: () => void
  onMessages: () => void; onFeedback: () => void
  onCreateDiet: () => void; onCreateTraining: () => void
}) {
  const p = client.profile
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([])
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client.client_id) return
    Promise.all([
      supabase.from('diet_plans').select('*').eq('user_id', client.client_id).order('created_at', { ascending: false }),
      supabase.from('training_plans').select('*').eq('user_id', client.client_id).order('created_at', { ascending: false }),
    ]).then(([dietRes, trainingRes]) => {
      if (dietRes.data) setDietPlans(dietRes.data as DietPlan[])
      if (trainingRes.data) setTrainingPlans(trainingRes.data as TrainingPlan[])
      setLoading(false)
    })
  }, [client.client_id])

  return (
    <SafeAreaView style={st.container}>
      <View style={st.detailHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={st.detailTitle}>{p?.full_name || client.invited_email || 'Client'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={st.content}>
        {/* Profile Card */}
        {p && (
          <View style={st.profileCard}>
            <View style={st.profileRow}>
              <View style={st.avatarLg}>
                <Text style={st.avatarLgText}>{(p.full_name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.profileName}>{p.full_name}</Text>
                <Text style={st.profileMeta}>{p.gender}, {p.age}y · {p.weight_kg}kg · {p.height_cm}cm</Text>
              </View>
            </View>

            {/* Targets */}
            <View style={st.targetsRow}>
              <TargetPill label="Cal" value={p.daily_calories} color={brandColors.brand500} />
              <TargetPill label="P" value={p.daily_protein} color="#3b82f6" />
              <TargetPill label="C" value={p.daily_carbs} color="#f59e0b" />
              <TargetPill label="F" value={p.daily_fat} color="#ef4444" />
            </View>

            {/* Anamnesis summary */}
            {(p.injuries?.length > 0 || p.medical_conditions?.length > 0 || p.dietary_restrictions?.length > 0) && (
              <View style={st.anamnesisBox}>
                {p.injuries?.length > 0 && <AnamnesisRow icon="bandage-outline" label="Injuries" value={p.injuries.join(', ')} />}
                {p.medical_conditions?.length > 0 && <AnamnesisRow icon="medical-outline" label="Conditions" value={p.medical_conditions.join(', ')} />}
                {p.dietary_restrictions?.length > 0 && <AnamnesisRow icon="leaf-outline" label="Diet" value={p.dietary_restrictions.join(', ')} />}
                {p.food_dislikes?.length > 0 && <AnamnesisRow icon="thumbs-down-outline" label="Dislikes" value={p.food_dislikes.join(', ')} />}
                {p.training_experience && <AnamnesisRow icon="fitness-outline" label="Experience" value={p.training_experience} />}
                {p.equipment_access && <AnamnesisRow icon="barbell-outline" label="Equipment" value={p.equipment_access.replace(/_/g, ' ')} />}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={st.actionsGrid}>
          <TouchableOpacity style={st.actionCard} onPress={onMessages}>
            <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
            <Text style={st.actionLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionCard} onPress={onFeedback}>
            <Ionicons name="clipboard" size={24} color={brandColors.brand500} />
            <Text style={st.actionLabel}>Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Diet Plans */}
        <View style={st.planSection}>
          <View style={st.planSectionHeader}>
            <Text style={st.planSectionTitle}>Diet Plans</Text>
            <TouchableOpacity onPress={onCreateDiet}>
              <Ionicons name="add-circle" size={28} color={brandColors.brand500} />
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator /> : dietPlans.length === 0 ? (
            <Text style={st.noPlanText}>No diet plans yet</Text>
          ) : dietPlans.map(plan => (
            <View key={plan.id} style={st.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={st.planName}>{plan.name}</Text>
                <Text style={st.planMeta}>{plan.target_calories} kcal · P{plan.target_protein}g C{plan.target_carbs}g F{plan.target_fat}g</Text>
              </View>
              {plan.is_active && <View style={st.activeBadge}><Text style={st.badgeText}>Active</Text></View>}
            </View>
          ))}
        </View>

        {/* Training Plans */}
        <View style={st.planSection}>
          <View style={st.planSectionHeader}>
            <Text style={st.planSectionTitle}>Training Plans</Text>
            <TouchableOpacity onPress={onCreateTraining}>
              <Ionicons name="add-circle" size={28} color={brandColors.brand500} />
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator /> : trainingPlans.length === 0 ? (
            <Text style={st.noPlanText}>No training plans yet</Text>
          ) : trainingPlans.map(plan => (
            <View key={plan.id} style={st.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={st.planName}>{plan.name}</Text>
                <Text style={st.planMeta}>{plan.days_per_week}x/week{plan.description ? ` · ${plan.description}` : ''}</Text>
              </View>
              {plan.is_active && <View style={st.activeBadge}><Text style={st.badgeText}>Active</Text></View>}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function TargetPill({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={st.targetPill}>
      <Text style={[st.targetValue, { color }]}>{value ?? '—'}</Text>
      <Text style={st.targetLabel}>{label}</Text>
    </View>
  )
}

function AnamnesisRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={st.anamnesisRow}>
      <Ionicons name={icon as any} size={16} color="#6b7280" />
      <Text style={st.anamnesisLabel}>{label}:</Text>
      <Text style={st.anamnesisValue}>{value}</Text>
    </View>
  )
}

// ─── Messages Screen ────────────────────────────────────
function MessagesScreen({ client, user, onBack }: { client: ClientWithProfile; user: any; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const getOrCreateConversation = useCallback(async () => {
    if (!user || !client.client_id) return null
    // Try to find existing
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('nutritionist_id', user.id)
      .eq('client_id', client.client_id)
      .single()

    if (existing) return existing.id

    // Create new
    const { data: created } = await supabase
      .from('conversations')
      .insert({ nutritionist_id: user.id, client_id: client.client_id })
      .select('id')
      .single()

    return created?.id ?? null
  }, [user, client.client_id])

  const fetchMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])

    // Mark unread as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .neq('sender_id', user.id)
      .is('read_at', null)
  }, [user])

  useEffect(() => {
    getOrCreateConversation().then(id => {
      if (id) {
        setConversationId(id)
        fetchMessages(id)

        // Subscribe to new messages
        const channel = supabase
          .channel(`messages:${id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
            (payload) => {
              setMessages(prev => [...prev, payload.new as Message])
            }
          )
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      }
    })
  }, [])

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !user) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text.trim(),
    })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
    setText('')
    setSending(false)
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.detailHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={st.detailTitle}>{client.profile?.full_name || client.invited_email || 'Messages'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id
          return (
            <View style={[st.msgBubble, isMe ? st.msgMe : st.msgThem]}>
              <Text style={[st.msgText, isMe && { color: '#fff' }]}>{item.content}</Text>
              <Text style={[st.msgTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )
        }}
      />

      <View style={st.inputBar}>
        <TextInput
          style={st.msgInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
        />
        <TouchableOpacity style={st.sendBtn} onPress={handleSend} disabled={sending || !text.trim()}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── Feedback Screen ────────────────────────────────────
function FeedbackScreen({ client, user, onBack }: { client: ClientWithProfile; user: any; onBack: () => void }) {
  const [requests, setRequests] = useState<FeedbackRequest[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [fbTitle, setFbTitle] = useState('')
  const [fbQuestions, setFbQuestions] = useState<FeedbackQuestion[]>([
    { id: '1', question: 'How are you feeling this week?', type: 'text' },
    { id: '2', question: 'Energy level (1-5)', type: 'rating' },
    { id: '3', question: 'Following the meal plan?', type: 'yes_no' },
  ])
  const [saving, setSaving] = useState(false)

  const fetchFeedback = async () => {
    if (!client.client_id) return
    const { data } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('nutritionist_id', user.id)
      .eq('client_id', client.client_id)
      .order('created_at', { ascending: false })
    if (data) setRequests(data as FeedbackRequest[])
  }

  useEffect(() => { fetchFeedback() }, [])

  const addQuestion = (type: 'text' | 'rating' | 'yes_no') => {
    setFbQuestions([...fbQuestions, {
      id: String(Date.now()),
      question: '',
      type,
    }])
  }

  const updateQuestion = (id: string, question: string) => {
    setFbQuestions(fbQuestions.map(q => q.id === id ? { ...q, question } : q))
  }

  const removeQuestion = (id: string) => {
    if (fbQuestions.length <= 1) return
    setFbQuestions(fbQuestions.filter(q => q.id !== id))
  }

  const handleSend = async () => {
    if (!fbTitle.trim()) { Alert.alert('Error', 'Add a title'); return }
    const validQs = fbQuestions.filter(q => q.question.trim())
    if (validQs.length === 0) { Alert.alert('Error', 'Add at least one question'); return }

    setSaving(true)
    const { error } = await supabase.from('feedback_requests').insert({
      nutritionist_id: user.id,
      client_id: client.client_id,
      title: fbTitle.trim(),
      questions: validQs,
    })
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Sent!', 'Feedback request sent to client.')
    setShowCreate(false)
    setFbTitle('')
    setFbQuestions([{ id: '1', question: '', type: 'text' }])
    await fetchFeedback()
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.detailHeader}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={st.detailTitle}>Feedback</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}><Ionicons name="add-circle" size={28} color={brandColors.brand500} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content}>
        {requests.length === 0 && !showCreate ? (
          <View style={st.empty}>
            <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
            <Text style={st.emptyText}>No feedback requests</Text>
            <TouchableOpacity onPress={() => setShowCreate(true)}>
              <Text style={st.emptyLink}>Request feedback</Text>
            </TouchableOpacity>
          </View>
        ) : requests.map(fb => (
          <View key={fb.id} style={st.fbCard}>
            <View style={st.fbHeader}>
              <Text style={st.fbTitle}>{fb.title}</Text>
              <View style={[st.fbBadge, fb.status === 'completed' && st.fbBadgeDone]}>
                <Text style={[st.fbBadgeText, fb.status === 'completed' && st.fbBadgeTextDone]}>
                  {fb.status === 'completed' ? 'Responded' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={st.fbDate}>{new Date(fb.created_at).toLocaleDateString()}</Text>

            {fb.status === 'completed' && fb.responses && (
              <View style={st.fbResponses}>
                {fb.questions.map((q: FeedbackQuestion, i: number) => {
                  const resp = (fb.responses as any)?.[i]
                  return (
                    <View key={q.id} style={st.fbResponseRow}>
                      <Text style={st.fbQuestion}>{q.question}</Text>
                      <Text style={st.fbAnswer}>{resp?.answer ?? '—'}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        ))}

        {showCreate && (
          <View style={st.fbCreateCard}>
            <Text style={st.fbCreateTitle}>New Feedback Request</Text>

            <Text style={st.label}>Title</Text>
            <TextInput style={st.input} value={fbTitle} onChangeText={setFbTitle} placeholder="e.g. Weekly Check-in" placeholderTextColor="#9ca3af" />

            <Text style={[st.label, { marginTop: 16 }]}>Questions</Text>
            {fbQuestions.map((q, i) => (
              <View key={q.id} style={st.fbQRow}>
                <View style={{ flex: 1 }}>
                  <View style={st.fbQTypeRow}>
                    <Text style={st.fbQType}>{q.type === 'text' ? '📝 Text' : q.type === 'rating' ? '⭐ Rating (1-5)' : '✅ Yes/No'}</Text>
                    {fbQuestions.length > 1 && (
                      <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                        <Ionicons name="close-circle" size={20} color="#d1d5db" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput style={st.input} value={q.question} onChangeText={(t) => updateQuestion(q.id, t)} placeholder="Type your question..." placeholderTextColor="#9ca3af" />
                </View>
              </View>
            ))}

            <View style={st.addQRow}>
              <TouchableOpacity style={st.addQBtn} onPress={() => addQuestion('text')}><Text style={st.addQText}>+ Text</Text></TouchableOpacity>
              <TouchableOpacity style={st.addQBtn} onPress={() => addQuestion('rating')}><Text style={st.addQText}>+ Rating</Text></TouchableOpacity>
              <TouchableOpacity style={st.addQBtn} onPress={() => addQuestion('yes_no')}><Text style={st.addQText}>+ Yes/No</Text></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleSend} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Send to Client</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Create Diet Plan for Client ────────────────────────
function CreateClientDietPlan({ client, user, onDone, onCancel }: {
  client: ClientWithProfile; user: any; onDone: () => void; onCancel: () => void
}) {
  const clientName = client.profile?.full_name || client.invited_email || 'Client'
  const [planName, setPlanName] = useState('')
  const [meals, setMeals] = useState<MealEntry[]>([
    { meal_type: 'breakfast', meal_name: 'Breakfast', foods: [] },
    { meal_type: 'lunch', meal_name: 'Lunch', foods: [] },
    { meal_type: 'dinner', meal_name: 'Dinner', foods: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [searchMealIdx, setSearchMealIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingNutrition, setLoadingNutrition] = useState<number | null>(null)

  const searchFood = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`${API_URL}/api/food/search?query=${encodeURIComponent(searchQuery)}&number=10`)
      if (res.ok) { setSearchResults((await res.json()).results || []) }
    } catch { Alert.alert('Error', 'Could not search foods') }
    setSearching(false)
  }

  const addFood = async (food: any) => {
    setLoadingNutrition(food.id)
    try {
      const res = await fetch(`${API_URL}/api/food/nutrition?id=${food.id}&amount=100&unit=g`)
      if (res.ok) {
        const data = await res.json()
        const foodItem: FoodItem = {
          spoonacular_id: food.id, name: food.name, amount: 100, unit: 'g',
          calories: Math.round(data.calories || 0), protein: Math.round(data.protein || 0),
          carbs: Math.round(data.carbs || 0), fat: Math.round(data.fat || 0),
        }
        const updated = [...meals]
        updated[searchMealIdx].foods.push(foodItem)
        setMeals(updated)
      }
    } catch { Alert.alert('Error', 'Could not load nutrition info') }
    setLoadingNutrition(null)
  }

  const removeFood = (mealIdx: number, foodIdx: number) => {
    const updated = [...meals]; updated[mealIdx].foods.splice(foodIdx, 1); setMeals(updated)
  }

  const addMeal = () => setMeals([...meals, { meal_type: 'snack', meal_name: 'Snack', foods: [] }])

  const totalCals = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.calories, 0), 0)
  const totalProtein = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.protein, 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.carbs, 0), 0)
  const totalFat = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + f.fat, 0), 0)

  const handleSave = async () => {
    if (!planName.trim()) { Alert.alert('Error', 'Enter a plan name'); return }
    if (meals.every(m => m.foods.length === 0)) { Alert.alert('Error', 'Add at least one food'); return }
    if (!client.client_id) { Alert.alert('Error', 'Client has not signed up yet'); return }

    setSaving(true)
    // Deactivate client's old plans
    await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', client.client_id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('diet_plans').insert({
      user_id: client.client_id, created_by: user.id, name: planName,
      target_calories: totalCals, target_protein: totalProtein, target_carbs: totalCarbs, target_fat: totalFat,
      is_active: true,
    }).select().single()

    if (error || !plan) { Alert.alert('Error', error?.message || 'Failed'); setSaving(false); return }

    const mealRows = meals.filter(m => m.foods.length > 0).map(m => ({
      diet_plan_id: plan.id, meal_type: m.meal_type, meal_name: m.meal_name, foods: m.foods,
      total_calories: m.foods.reduce((s, f) => s + f.calories, 0),
      total_protein: m.foods.reduce((s, f) => s + f.protein, 0),
      total_carbs: m.foods.reduce((s, f) => s + f.carbs, 0),
      total_fat: m.foods.reduce((s, f) => s + f.fat, 0),
    }))
    await supabase.from('diet_plan_meals').insert(mealRows)

    setSaving(false)
    Alert.alert('Success', `Diet plan created for ${clientName}`)
    onDone()
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.detailHeader}>
        <TouchableOpacity onPress={onCancel}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={st.detailTitle}>Diet Plan for {clientName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Client's target summary */}
      {client.profile && (
        <View style={st.clientTargetBar}>
          <Text style={st.clientTargetLabel}>Targets:</Text>
          <Text style={st.clientTargetValue}>{client.profile.daily_calories ?? '—'} kcal</Text>
          <Text style={st.clientTargetValue}>P{client.profile.daily_protein ?? '—'}</Text>
          <Text style={st.clientTargetValue}>C{client.profile.daily_carbs ?? '—'}</Text>
          <Text style={st.clientTargetValue}>F{client.profile.daily_fat ?? '—'}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Plan Name</Text>
        <TextInput style={st.input} value={planName} onChangeText={setPlanName} placeholder="e.g. Cutting Plan" placeholderTextColor="#9ca3af" />

        {/* Current totals */}
        <View style={st.macroSummary}>
          <View style={st.macroBox}><Text style={[st.macroValue, { color: brandColors.brand500 }]}>{totalCals}</Text><Text style={st.macroLabel}>Cals</Text></View>
          <View style={st.macroBox}><Text style={[st.macroValue, { color: '#3b82f6' }]}>{totalProtein}g</Text><Text style={st.macroLabel}>Protein</Text></View>
          <View style={st.macroBox}><Text style={[st.macroValue, { color: '#f59e0b' }]}>{totalCarbs}g</Text><Text style={st.macroLabel}>Carbs</Text></View>
          <View style={st.macroBox}><Text style={[st.macroValue, { color: '#ef4444' }]}>{totalFat}g</Text><Text style={st.macroLabel}>Fat</Text></View>
        </View>

        {meals.map((meal, mi) => (
          <View key={mi} style={st.mealCard}>
            <View style={st.mealHeader}>
              <Text style={st.mealName}>{meal.meal_name}</Text>
              <Text style={st.mealCals}>{meal.foods.reduce((s, f) => s + f.calories, 0)} kcal</Text>
            </View>
            {meal.foods.map((food, fi) => (
              <View key={fi} style={st.foodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.foodName}>{food.name}</Text>
                  <Text style={st.foodMacros}>{food.amount}{food.unit} · {food.calories}kcal · P{food.protein} C{food.carbs} F{food.fat}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFood(mi, fi)}><Ionicons name="close-circle" size={20} color="#d1d5db" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={st.addItemBtn} onPress={() => { setSearchMealIdx(mi); setShowFoodSearch(true); setSearchQuery(''); setSearchResults([]) }}>
              <Ionicons name="search" size={18} color={brandColors.brand500} />
              <Text style={st.addItemText}>Search & Add Food</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={st.addRowBtn} onPress={addMeal}>
          <Ionicons name="add" size={18} color={brandColors.brand500} />
          <Text style={st.addRowText}>Add Snack</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Create Plan</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Food Search Modal */}
      <Modal visible={showFoodSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.container}>
          <View style={st.modalHeader}>
            <TouchableOpacity onPress={() => setShowFoodSearch(false)}><Text style={st.cancelText}>Done</Text></TouchableOpacity>
            <Text style={st.modalTitle}>Search Food</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 16 }}>
            <View style={st.searchRow}>
              <TextInput style={[st.input, { flex: 1 }]} value={searchQuery} onChangeText={setSearchQuery}
                placeholder="e.g. chicken breast, rice..." placeholderTextColor="#9ca3af" returnKeyType="search" onSubmitEditing={searchFood} />
              <TouchableOpacity style={st.searchBtn} onPress={searchFood}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={st.foodSearchItem} onPress={() => addFood(item)} disabled={loadingNutrition === item.id}>
                <Text style={st.foodSearchName}>{item.name}</Text>
                {loadingNutrition === item.id ? <ActivityIndicator size="small" color={brandColors.brand500} /> : <Ionicons name="add-circle" size={24} color={brandColors.brand500} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={!searching ? <Text style={st.emptySearch}>Search for ingredients to add</Text> : null}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Create Training Plan for Client ────────────────────
function CreateClientTrainingPlan({ client, user, onDone, onCancel }: {
  client: ClientWithProfile; user: any; onDone: () => void; onCancel: () => void
}) {
  const clientName = client.profile?.full_name || client.invited_email || 'Client'
  const [planName, setPlanName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<DayEntry[]>([{ name: 'Day 1', exercises: [] }])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerDayIdx, setPickerDayIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [filterBody, setFilterBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').then(({ data }) => { if (data) setAllExercises(data as Exercise[]) })
  }, [])

  const filteredExercises = allExercises.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterBody && e.body_part !== filterBody) return false
    return true
  })

  const addDay = () => setDays([...days, { name: `Day ${days.length + 1}`, exercises: [] }])
  const removeDay = (i: number) => { if (days.length > 1) setDays(days.filter((_, idx) => idx !== i)) }

  const addExercise = (exercise: Exercise) => {
    const updated = [...days]
    updated[pickerDayIdx].exercises.push({ exercise, sets: DEFAULT_SETS, reps: DEFAULT_REPS, rest_seconds: DEFAULT_REST_SECONDS })
    setDays(updated)
    setShowPicker(false)
  }

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days]; updated[dayIdx].exercises.splice(exIdx, 1); setDays(updated)
  }

  const updateExercise = (dayIdx: number, exIdx: number, field: 'sets' | 'reps' | 'rest_seconds', value: string) => {
    const updated = [...days]
    const ex = updated[dayIdx].exercises[exIdx]
    if (field === 'sets') ex.sets = parseInt(value) || 0
    else if (field === 'reps') ex.reps = value
    else ex.rest_seconds = parseInt(value) || 0
    setDays(updated)
  }

  const handleSave = async () => {
    if (!planName.trim()) { Alert.alert('Error', 'Enter a plan name'); return }
    if (days.some(d => d.exercises.length === 0)) { Alert.alert('Error', 'Each day needs at least one exercise'); return }
    if (!client.client_id) { Alert.alert('Error', 'Client has not signed up yet'); return }

    setSaving(true)
    // Deactivate client's old plans
    await supabase.from('training_plans').update({ is_active: false }).eq('user_id', client.client_id).eq('is_active', true)

    const { data: plan, error } = await supabase.from('training_plans').insert({
      user_id: client.client_id, created_by: user.id, name: planName,
      description: description.trim() || null, days_per_week: days.length, is_active: true,
    }).select().single()

    if (error || !plan) { Alert.alert('Error', error?.message || 'Failed'); setSaving(false); return }

    for (let i = 0; i < days.length; i++) {
      const { data: day } = await supabase.from('training_plan_days').insert({
        training_plan_id: plan.id, day_number: i + 1, name: days[i].name,
      }).select().single()
      if (!day) continue

      const exerciseRows = days[i].exercises.map((e, idx) => ({
        plan_day_id: day.id, exercise_id: e.exercise.id, order_index: idx,
        sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds,
      }))
      await supabase.from('training_plan_exercises').insert(exerciseRows)
    }

    setSaving(false)
    Alert.alert('Success', `Training plan created for ${clientName}`)
    onDone()
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.detailHeader}>
        <TouchableOpacity onPress={onCancel}><Ionicons name="arrow-back" size={24} color="#374151" /></TouchableOpacity>
        <Text style={st.detailTitle}>Training for {clientName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Client's anamnesis summary */}
      {client.profile && (client.profile.injuries?.length > 0 || client.profile.training_experience || client.profile.equipment_access) && (
        <View style={st.clientTargetBar}>
          {client.profile.training_experience && <Text style={st.clientTargetValue}>Exp: {client.profile.training_experience}</Text>}
          {client.profile.equipment_access && <Text style={st.clientTargetValue}>Equip: {client.profile.equipment_access.replace(/_/g, ' ')}</Text>}
          {client.profile.injuries?.length > 0 && <Text style={[st.clientTargetValue, { color: '#ef4444' }]}>Injuries: {client.profile.injuries.join(', ')}</Text>}
        </View>
      )}

      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Plan Name</Text>
        <TextInput style={st.input} value={planName} onChangeText={setPlanName} placeholder="e.g. Push Pull Legs" placeholderTextColor="#9ca3af" />

        <Text style={[st.label, { marginTop: 14 }]}>Description (optional)</Text>
        <TextInput style={st.input} value={description} onChangeText={setDescription} placeholder="e.g. 4-week hypertrophy focus" placeholderTextColor="#9ca3af" />

        {days.map((day, di) => (
          <View key={di} style={st.dayCard}>
            <View style={st.dayHeader}>
              <TextInput style={st.dayNameInput} value={day.name} onChangeText={(t) => { const u = [...days]; u[di].name = t; setDays(u) }} />
              {days.length > 1 && <TouchableOpacity onPress={() => removeDay(di)}><Ionicons name="trash-outline" size={20} color="#ef4444" /></TouchableOpacity>}
            </View>
            {day.exercises.map((ex, ei) => (
              <View key={ei} style={st.exerciseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.exerciseName}>{ex.exercise.name}</Text>
                  <View style={st.exerciseInputRow}>
                    <View style={st.exerciseInputGroup}>
                      <Text style={st.exerciseInputLabel}>Sets</Text>
                      <TextInput style={st.exerciseInputField} value={String(ex.sets)} onChangeText={(v) => updateExercise(di, ei, 'sets', v)} keyboardType="number-pad" />
                    </View>
                    <View style={st.exerciseInputGroup}>
                      <Text style={st.exerciseInputLabel}>Reps</Text>
                      <TextInput style={st.exerciseInputField} value={ex.reps} onChangeText={(v) => updateExercise(di, ei, 'reps', v)} />
                    </View>
                    <View style={st.exerciseInputGroup}>
                      <Text style={st.exerciseInputLabel}>Rest(s)</Text>
                      <TextInput style={st.exerciseInputField} value={String(ex.rest_seconds)} onChangeText={(v) => updateExercise(di, ei, 'rest_seconds', v)} keyboardType="number-pad" />
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeExercise(di, ei)} style={{ marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={st.addItemBtn} onPress={() => { setPickerDayIdx(di); setShowPicker(true); setSearch(''); setFilterBody('') }}>
              <Ionicons name="add-circle-outline" size={20} color={brandColors.brand500} />
              <Text style={st.addItemText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={st.addRowBtn} onPress={addDay}>
          <Ionicons name="add" size={18} color={brandColors.brand500} />
          <Text style={st.addRowText}>Add Day</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Create Plan</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.container}>
          <View style={st.modalHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={st.cancelText}>Close</Text></TouchableOpacity>
            <Text style={st.modalTitle}>Pick Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ padding: 16, gap: 8 }}>
            <TextInput style={st.input} placeholder="Search exercises..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <TouchableOpacity style={[st.filterChip, !filterBody && st.filterChipActive]} onPress={() => setFilterBody('')}>
                <Text style={[st.filterChipText, !filterBody && st.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              {BODY_PARTS.map(bp => (
                <TouchableOpacity key={bp.value} style={[st.filterChip, filterBody === bp.value && st.filterChipActive]}
                  onPress={() => setFilterBody(filterBody === bp.value ? '' : bp.value)}>
                  <Text style={[st.filterChipText, filterBody === bp.value && st.filterChipTextActive]}>{bp.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={st.pickItem} onPress={() => addExercise(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={st.pickName}>{item.name}</Text>
                  <Text style={st.pickMeta}>{item.body_part} · {item.equipment}{item.is_compound ? ' · compound' : ''}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={brandColors.brand500} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: brandColors.foreground, letterSpacing: -0.6 },
  addBtn: { backgroundColor: brandColors.brand900, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: brandColors.textMuted },
  emptyLink: { fontSize: 15, fontWeight: '600', color: brandColors.brand500, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: brandColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  // Client card
  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 8, ...brandShadow },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: brandColors.brand100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: brandColors.brand500 },
  clientName: { fontSize: 16, fontWeight: '600', color: brandColors.foregroundSoft },
  clientMeta: { fontSize: 13, color: brandColors.textSubtle, marginTop: 2 },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  cancelText: { fontSize: 16, color: brandColors.textMuted },
  modalTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  label: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft, marginBottom: 6 },
  hint: { fontSize: 12, color: brandColors.textSubtle, marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: brandColors.foreground },
  primaryBtn: { flex: 2, backgroundColor: brandColors.brand900, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: brandColors.lineStrong, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: brandColors.textMuted },
  // Detail screen
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: brandColors.foreground },
  profileCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, borderWidth: 1, borderColor: brandColors.line, padding: 18, marginBottom: 16, ...brandShadow },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarLg: { width: 56, height: 56, borderRadius: 28, backgroundColor: brandColors.brand100, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { fontSize: 24, fontWeight: '700', color: brandColors.brand500 },
  profileName: { fontSize: 20, fontWeight: '800', color: brandColors.foreground },
  profileMeta: { fontSize: 14, color: brandColors.textMuted, marginTop: 2 },
  targetsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  targetPill: { alignItems: 'center' },
  targetValue: { fontSize: 18, fontWeight: '800' },
  targetLabel: { fontSize: 11, color: brandColors.textMuted, marginTop: 2 },
  anamnesisBox: { borderTopWidth: 1, borderTopColor: brandColors.line, paddingTop: 12, gap: 6 },
  anamnesisRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  anamnesisLabel: { fontSize: 12, fontWeight: '600', color: brandColors.textMuted },
  anamnesisValue: { fontSize: 12, color: brandColors.foregroundSoft, flex: 1 },
  // Actions
  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 16, alignItems: 'center', gap: 6, ...brandShadow },
  actionLabel: { fontSize: 13, fontWeight: '600', color: brandColors.foregroundSoft },
  // Plans
  planSection: { marginBottom: 20 },
  planSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planSectionTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foreground },
  noPlanText: { fontSize: 14, color: brandColors.textSubtle, fontStyle: 'italic' },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 14, marginBottom: 8, ...brandShadow },
  planName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft },
  planMeta: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
  activeBadge: { backgroundColor: brandColors.brand100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: brandColors.brand500 },
  // Messages
  msgBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  msgMe: { backgroundColor: brandColors.brand900, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgThem: { backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: brandColors.line },
  msgText: { fontSize: 15, color: brandColors.foregroundSoft, lineHeight: 20 },
  msgTime: { fontSize: 10, color: brandColors.textSubtle, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: brandColors.line, backgroundColor: 'rgba(255,255,255,0.92)' },
  msgInput: { flex: 1, backgroundColor: brandColors.panelMuted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: brandColors.foreground, maxHeight: 100 },
  sendBtn: { backgroundColor: brandColors.brand900, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // Feedback
  fbCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 16, marginBottom: 10, ...brandShadow },
  fbHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fbTitle: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft },
  fbBadge: { backgroundColor: '#fff3d9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  fbBadgeDone: { backgroundColor: brandColors.brand100 },
  fbBadgeText: { fontSize: 11, fontWeight: '600', color: brandColors.warning },
  fbBadgeTextDone: { color: brandColors.brand500 },
  fbDate: { fontSize: 12, color: brandColors.textSubtle, marginTop: 4 },
  fbResponses: { borderTopWidth: 1, borderTopColor: brandColors.line, marginTop: 12, paddingTop: 10, gap: 8 },
  fbResponseRow: { gap: 2 },
  fbQuestion: { fontSize: 13, fontWeight: '600', color: brandColors.textMuted },
  fbAnswer: { fontSize: 14, color: brandColors.foregroundSoft },
  fbCreateCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, borderWidth: 1, borderColor: brandColors.line, padding: 18, ...brandShadow },
  fbCreateTitle: { fontSize: 17, fontWeight: '700', color: brandColors.foreground, marginBottom: 12 },
  fbQRow: { marginBottom: 12 },
  fbQTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fbQType: { fontSize: 12, fontWeight: '600', color: brandColors.textMuted },
  addQRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addQBtn: { borderWidth: 1, borderColor: brandColors.line, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.84)', paddingVertical: 8, paddingHorizontal: 14 },
  addQText: { fontSize: 13, fontWeight: '600', color: brandColors.brand500 },
  // Plan creation - client target bar
  clientTargetBar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 20, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  clientTargetLabel: { fontSize: 13, fontWeight: '700', color: brandColors.foregroundSoft },
  clientTargetValue: { fontSize: 13, color: brandColors.textMuted },
  // Macro summary
  macroSummary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 14, marginVertical: 14, ...brandShadow },
  macroBox: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 11, color: brandColors.textMuted, marginTop: 2 },
  // Meal card (diet plan creation)
  mealCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 14, marginBottom: 10, ...brandShadow },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealName: { fontSize: 15, fontWeight: '700', color: brandColors.foregroundSoft },
  mealCals: { fontSize: 13, fontWeight: '600', color: brandColors.brand500 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: brandColors.line },
  foodName: { fontSize: 14, fontWeight: '500', color: brandColors.foregroundSoft },
  foodMacros: { fontSize: 11, color: brandColors.textSubtle, marginTop: 1 },
  // Day card (training plan creation)
  dayCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderWidth: 1, borderColor: brandColors.line, padding: 14, marginTop: 14, ...brandShadow },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayNameInput: { fontSize: 16, fontWeight: '700', color: brandColors.foregroundSoft, flex: 1 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: brandColors.line },
  exerciseName: { fontSize: 14, fontWeight: '600', color: brandColors.foregroundSoft },
  exerciseInputRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  exerciseInputGroup: { alignItems: 'center' },
  exerciseInputLabel: { fontSize: 10, color: brandColors.textSubtle, marginBottom: 2 },
  exerciseInputField: { backgroundColor: brandColors.panelMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: brandColors.foreground, width: 60, textAlign: 'center' },
  // Shared add buttons
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addItemText: { fontSize: 14, fontWeight: '600', color: brandColors.brand500 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1, borderColor: brandColors.line, borderRadius: 16, borderStyle: 'dashed', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.84)' },
  addRowText: { fontSize: 14, fontWeight: '600', color: brandColors.brand500 },
  // Search modal
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBtn: { backgroundColor: brandColors.brand900, width: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  foodSearchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  foodSearchName: { fontSize: 15, fontWeight: '500', color: brandColors.foregroundSoft },
  emptySearch: { textAlign: 'center', color: brandColors.textSubtle, fontSize: 14, paddingTop: 24 },
  // Exercise picker
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: brandColors.panelMuted },
  filterChipActive: { backgroundColor: brandColors.brand900 },
  filterChipText: { fontSize: 13, fontWeight: '500', color: brandColors.textMuted },
  filterChipTextActive: { color: '#fff' },
  pickItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: brandColors.line },
  pickName: { fontSize: 15, fontWeight: '600', color: brandColors.foregroundSoft },
  pickMeta: { fontSize: 12, color: brandColors.textSubtle, marginTop: 2 },
})
