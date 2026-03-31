-- 017: Training progress check-ins
-- Stores AI-generated progress reports every ~2 weeks

CREATE TABLE training_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  training_plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  workouts_logged INT NOT NULL DEFAULT 0,
  workouts_planned INT NOT NULL DEFAULT 0,
  exercise_progress JSONB NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  ai_recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins"
  ON training_check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins"
  ON training_check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_training_check_ins_user ON training_check_ins(user_id, check_in_date DESC);
