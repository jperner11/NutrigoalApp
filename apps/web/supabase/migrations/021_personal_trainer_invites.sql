-- Personal trainer invite lifecycle and role expansion

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES user_profiles(id);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS personal_trainer_id UUID REFERENCES user_profiles(id);

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client', 'personal_trainer', 'personal_trainer_client'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client', 'personal_trainer', 'personal_trainer_client'));

UPDATE user_profiles
SET
  role = CASE
    WHEN role = 'nutritionist' THEN 'personal_trainer'
    WHEN role = 'nutritionist_client' THEN 'personal_trainer_client'
    ELSE role
  END,
  personal_trainer_id = COALESCE(personal_trainer_id, nutritionist_id)
WHERE role IN ('nutritionist', 'nutritionist_client')
   OR (nutritionist_id IS NOT NULL AND personal_trainer_id IS NULL);

CREATE TABLE IF NOT EXISTS personal_trainer_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personal_trainer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  client_first_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'declined')),
  invite_token TEXT NOT NULL UNIQUE,
  delivery_method TEXT NOT NULL DEFAULT 'invite' CHECK (delivery_method IN ('invite', 'magiclink')),
  invited_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS personal_trainer_invites_updated_at ON personal_trainer_invites;

CREATE TRIGGER personal_trainer_invites_updated_at
  BEFORE UPDATE ON personal_trainer_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_invites_pending_email
  ON personal_trainer_invites(personal_trainer_id, invited_email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pt_invites_lookup_token
  ON personal_trainer_invites(invite_token);

CREATE INDEX IF NOT EXISTS idx_pt_invites_lookup_trainer
  ON personal_trainer_invites(personal_trainer_id, status, created_at DESC);

ALTER TABLE personal_trainer_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_trainer_invites_select_own ON personal_trainer_invites;
CREATE POLICY personal_trainer_invites_select_own
  ON personal_trainer_invites FOR SELECT
  USING (
    personal_trainer_id = auth.uid()
    OR invited_user_id = auth.uid()
    OR LOWER(invited_email) = LOWER((auth.jwt() ->> 'email')::text)
  );

DROP POLICY IF EXISTS personal_trainer_invites_insert_own ON personal_trainer_invites;
CREATE POLICY personal_trainer_invites_insert_own
  ON personal_trainer_invites FOR INSERT
  WITH CHECK (personal_trainer_id = auth.uid());

DROP POLICY IF EXISTS personal_trainer_invites_update_own ON personal_trainer_invites;
CREATE POLICY personal_trainer_invites_update_own
  ON personal_trainer_invites FOR UPDATE
  USING (
    personal_trainer_id = auth.uid()
    OR invited_user_id = auth.uid()
    OR LOWER(invited_email) = LOWER((auth.jwt() ->> 'email')::text)
  );
