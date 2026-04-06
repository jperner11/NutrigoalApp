-- 028: coach marketplace crm and offers

ALTER TABLE coach_public_profiles
  ADD COLUMN IF NOT EXISTS consultation_url TEXT;

CREATE TABLE IF NOT EXISTS coach_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL CHECK (price >= 0),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('one_time', 'weekly', 'monthly')),
  cta_label TEXT NOT NULL DEFAULT 'Apply for coaching',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS coach_offers_updated_at ON coach_offers;
CREATE TRIGGER coach_offers_updated_at
  BEFORE UPDATE ON coach_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coach_offers_coach_order
  ON coach_offers(coach_id, is_active, sort_order, created_at);

ALTER TABLE coach_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_offers_select_public ON coach_offers;
CREATE POLICY coach_offers_select_public
  ON coach_offers FOR SELECT
  USING (
    coach_id = auth.uid()
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1
        FROM coach_public_profiles cpp
        WHERE cpp.coach_id = coach_offers.coach_id
          AND cpp.is_public = true
      )
    )
  );

DROP POLICY IF EXISTS coach_offers_insert_own ON coach_offers;
CREATE POLICY coach_offers_insert_own
  ON coach_offers FOR INSERT
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_offers_update_own ON coach_offers;
CREATE POLICY coach_offers_update_own
  ON coach_offers FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

ALTER TABLE coach_leads
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'consult_booked', 'won', 'lost')),
  ADD COLUMN IF NOT EXISTS selected_offer_id UUID REFERENCES coach_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_offer_title TEXT;

CREATE INDEX IF NOT EXISTS idx_coach_leads_stage
  ON coach_leads(coach_id, stage, created_at DESC);
