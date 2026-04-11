-- 030: coach wizard preferences and waitlist

ALTER TABLE coach_leads
  ADD COLUMN IF NOT EXISTS wizard_preferences JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS coach_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  preferences JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_waitlist_email_check CHECK (char_length(trim(email)) > 3)
);

CREATE INDEX IF NOT EXISTS idx_coach_waitlist_email_created_at
  ON coach_waitlist(email, created_at DESC);

ALTER TABLE coach_waitlist ENABLE ROW LEVEL SECURITY;
