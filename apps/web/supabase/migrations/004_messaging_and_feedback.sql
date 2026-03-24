-- 004: Messaging between PT/nutritionist and clients + feedback requests

-- ═══════════════════════════════════════════════════════════
-- CONVERSATIONS (1:1 between nutritionist and client)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, client_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- FEEDBACK REQUESTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE feedback_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  responses JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Conversations: both parties can see
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (nutritionist_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Nutritionists can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (nutritionist_id = auth.uid());

-- Messages: both parties in conversation
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE nutritionist_id = auth.uid() OR client_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE nutritionist_id = auth.uid() OR client_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE nutritionist_id = auth.uid() OR client_id = auth.uid()
    )
  );

-- Feedback requests
CREATE POLICY "Nutritionists can manage feedback requests"
  ON feedback_requests FOR ALL
  USING (nutritionist_id = auth.uid());

CREATE POLICY "Clients can view own feedback requests"
  ON feedback_requests FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can respond to feedback requests"
  ON feedback_requests FOR UPDATE
  USING (client_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_conversations_nutritionist ON conversations(nutritionist_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_feedback_client ON feedback_requests(client_id, status);
CREATE INDEX idx_feedback_nutritionist ON feedback_requests(nutritionist_id);

-- ═══════════════════════════════════════════════════════════
-- REALTIME: Enable for messages
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
