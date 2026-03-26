-- ─── User Supplements ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'twice_daily', 'three_times', 'weekly', 'as_needed')),
  time_of_day TEXT NOT NULL DEFAULT 'morning'
    CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'with_meals', 'pre_workout', 'post_workout', 'bedtime')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplements"
  ON user_supplements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Supplement Logs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, supplement_id, date)
);

ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplement logs"
  ON supplement_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_supplements_user ON user_supplements(user_id);
CREATE INDEX idx_supplement_logs_user_date ON supplement_logs(user_id, date);
