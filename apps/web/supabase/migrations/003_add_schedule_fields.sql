-- 003: Anamnesis fields, schedule, and supplement tracking
-- Adds comprehensive health/fitness intake data to user_profiles
-- Creates user_supplements table for pharma/supplement tracking

-- ═══════════════════════════════════════════════════════════
-- ANAMNESIS FIELDS ON USER_PROFILES
-- ═══════════════════════════════════════════════════════════

-- Schedule & timing
ALTER TABLE user_profiles
  ADD COLUMN wake_time TIME DEFAULT '07:00',
  ADD COLUMN sleep_time TIME DEFAULT '23:00',
  ADD COLUMN workout_time TIME DEFAULT '08:00',
  ADD COLUMN workout_days_per_week INT DEFAULT 4 CHECK (workout_days_per_week BETWEEN 1 AND 7),
  ADD COLUMN meals_per_day INT DEFAULT 3 CHECK (meals_per_day BETWEEN 2 AND 6);

-- Health & medical
ALTER TABLE user_profiles
  ADD COLUMN injuries TEXT[] DEFAULT '{}',
  ADD COLUMN medical_conditions TEXT[] DEFAULT '{}',
  ADD COLUMN medications TEXT[] DEFAULT '{}';

-- Fitness background
ALTER TABLE user_profiles
  ADD COLUMN training_experience TEXT DEFAULT 'beginner'
    CHECK (training_experience IN ('never', 'beginner', 'intermediate', 'advanced')),
  ADD COLUMN equipment_access TEXT DEFAULT 'full_gym'
    CHECK (equipment_access IN ('full_gym', 'home_basic', 'home_full', 'bodyweight_only', 'outdoor')),
  ADD COLUMN training_style TEXT[] DEFAULT '{hypertrophy}';

-- Nutrition background
ALTER TABLE user_profiles
  ADD COLUMN dietary_restrictions TEXT[] DEFAULT '{}',
  ADD COLUMN food_dislikes TEXT[] DEFAULT '{}',
  ADD COLUMN cooking_skill TEXT DEFAULT 'intermediate'
    CHECK (cooking_skill IN ('none', 'basic', 'intermediate', 'advanced')),
  ADD COLUMN meal_prep_preference TEXT DEFAULT 'daily'
    CHECK (meal_prep_preference IN ('daily', 'batch_prep', 'quick_only', 'eat_out'));

-- Lifestyle
ALTER TABLE user_profiles
  ADD COLUMN work_type TEXT DEFAULT 'desk'
    CHECK (work_type IN ('desk', 'active', 'hybrid', 'remote')),
  ADD COLUMN sleep_quality TEXT DEFAULT 'average'
    CHECK (sleep_quality IN ('poor', 'average', 'good')),
  ADD COLUMN stress_level TEXT DEFAULT 'moderate'
    CHECK (stress_level IN ('low', 'moderate', 'high'));

-- Enhanced goals
ALTER TABLE user_profiles
  ADD COLUMN target_weight_kg FLOAT,
  ADD COLUMN goal_timeline TEXT DEFAULT 'steady'
    CHECK (goal_timeline IN ('steady', '4_weeks', '8_weeks', '12_weeks', '6_months')),
  ADD COLUMN motivation TEXT[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════
-- USER SUPPLEMENTS (pharma / vitamins / supplements)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE user_supplements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'twice_daily', 'three_times', 'weekly', 'as_needed')),
  time_of_day TEXT DEFAULT 'morning' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'with_meals', 'pre_workout', 'post_workout', 'bedtime')),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for user_supplements
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplements"
  ON user_supplements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplements"
  ON user_supplements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplements"
  ON user_supplements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplements"
  ON user_supplements FOR DELETE
  USING (auth.uid() = user_id);

-- Track daily supplement intake
CREATE TABLE supplement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplement_id, date)
);

ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplement logs"
  ON supplement_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplement logs"
  ON supplement_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplement logs"
  ON supplement_logs FOR DELETE
  USING (auth.uid() = user_id);
