-- 027: coach discovery marketplace

CREATE TABLE IF NOT EXISTS coach_public_profiles (
  coach_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  headline TEXT,
  bio TEXT,
  location_label TEXT,
  price_from INT,
  price_to INT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  accepting_new_clients BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_public_profiles_price_bounds CHECK (
    (price_from IS NULL OR price_from >= 0)
    AND (price_to IS NULL OR price_to >= 0)
    AND (price_from IS NULL OR price_to IS NULL OR price_from <= price_to)
  ),
  CONSTRAINT coach_public_profiles_currency_code CHECK (char_length(currency) = 3)
);

DROP TRIGGER IF EXISTS coach_public_profiles_updated_at ON coach_public_profiles;
CREATE TRIGGER coach_public_profiles_updated_at
  BEFORE UPDATE ON coach_public_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coach_public_profiles_public
  ON coach_public_profiles(is_public, accepting_new_clients, updated_at DESC);

ALTER TABLE coach_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_public_profiles_select_public ON coach_public_profiles;
CREATE POLICY coach_public_profiles_select_public
  ON coach_public_profiles FOR SELECT
  USING (is_public = true OR coach_id = auth.uid());

DROP POLICY IF EXISTS coach_public_profiles_insert_own ON coach_public_profiles;
CREATE POLICY coach_public_profiles_insert_own
  ON coach_public_profiles FOR INSERT
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_public_profiles_update_own ON coach_public_profiles;
CREATE POLICY coach_public_profiles_update_own
  ON coach_public_profiles FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE TABLE IF NOT EXISTS coach_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'archived')),
  goal_summary TEXT NOT NULL,
  message TEXT,
  budget_label TEXT,
  preferred_format TEXT,
  experience_level TEXT CHECK (experience_level IN ('never', 'beginner', 'intermediate', 'advanced')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS idx_coach_leads_pending_unique;
CREATE UNIQUE INDEX idx_coach_leads_pending_unique
  ON coach_leads(coach_id, user_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS coach_leads_updated_at ON coach_leads;
CREATE TRIGGER coach_leads_updated_at
  BEFORE UPDATE ON coach_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coach_leads_coach_status
  ON coach_leads(coach_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_leads_user_status
  ON coach_leads(user_id, status, created_at DESC);

ALTER TABLE coach_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_leads_select_own ON coach_leads;
CREATE POLICY coach_leads_select_own
  ON coach_leads FOR SELECT
  USING (coach_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS coach_leads_insert_own ON coach_leads;
CREATE POLICY coach_leads_insert_own
  ON coach_leads FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS coach_leads_update_coach ON coach_leads;
CREATE POLICY coach_leads_update_coach
  ON coach_leads FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
