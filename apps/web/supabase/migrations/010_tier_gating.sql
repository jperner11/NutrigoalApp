-- Migration 010: Tier gating — add 'unlimited' role and user_tier_selections table

-- Expand role check to include 'unlimited'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('free', 'pro', 'unlimited', 'nutritionist'));

-- Table for free users to pick which meal/training day they can see
CREATE TABLE IF NOT EXISTS user_tier_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('meal', 'training_day')),
  selected_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, selection_type)
);

-- RLS
ALTER TABLE user_tier_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tier selections"
  ON user_tier_selections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tier selections"
  ON user_tier_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tier selections"
  ON user_tier_selections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tier selections"
  ON user_tier_selections FOR DELETE
  USING (auth.uid() = user_id);
