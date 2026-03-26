-- 007: Weight logging for progress tracking
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg FLOAT NOT NULL,
  body_fat_pct FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Nutritionists can view their clients' weight logs
CREATE POLICY "Nutritionists can view client weight logs"
  ON weight_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid()
        AND client_id = weight_logs.user_id
        AND status = 'active'
    )
  );
