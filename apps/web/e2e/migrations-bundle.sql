-- Treno migrations bundle — generated for the E2E TEST Supabase project.
-- Paste this whole file into the test project's SQL editor and run once.
-- Order matches apps/web/supabase/migrations/. Do NOT run against prod.


-- ============================================================
-- 001_initial_schema.sql
-- ============================================================
-- Treno v2 - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════
-- USER PROFILES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  age INT,
  height_cm FLOAT,
  weight_kg FLOAT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  goal TEXT CHECK (goal IN ('bulking', 'cutting', 'maintenance')),
  role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'pro', 'nutritionist')),
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  daily_calories INT,
  daily_protein FLOAT,
  daily_carbs FLOAT,
  daily_fat FLOAT,
  daily_water_ml INT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════
-- NUTRITIONIST PACKAGES & CLIENTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE nutritionist_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  max_clients INT NOT NULL DEFAULT 10,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nutritionist_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  invited_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, client_id)
);

-- ═══════════════════════════════════════════════════════════
-- AI USAGE TRACKING
-- ═══════════════════════════════════════════════════════════

CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('meal_suggestion', 'workout_suggestion')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to count AI usage for a user in current month
CREATE OR REPLACE FUNCTION get_monthly_ai_usage(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM ai_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';
$$ LANGUAGE sql STABLE;

-- Function to count total AI usage (for free tier lifetime limit)
CREATE OR REPLACE FUNCTION get_total_ai_usage(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM ai_usage
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════
-- DIET TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  target_calories INT,
  target_protein FLOAT,
  target_carbs FLOAT,
  target_fat FLOAT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diet_plan_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diet_plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  foods JSONB NOT NULL DEFAULT '[]',
  total_calories INT NOT NULL DEFAULT 0,
  total_protein FLOAT NOT NULL DEFAULT 0,
  total_carbs FLOAT NOT NULL DEFAULT 0,
  total_fat FLOAT NOT NULL DEFAULT 0
);

CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  foods JSONB NOT NULL DEFAULT '[]',
  total_calories INT NOT NULL DEFAULT 0,
  total_protein FLOAT NOT NULL DEFAULT 0,
  total_carbs FLOAT NOT NULL DEFAULT 0,
  total_fat FLOAT NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- TRAINING TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body_part TEXT NOT NULL CHECK (body_part IN ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'full_body')),
  equipment TEXT NOT NULL CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band')),
  description TEXT,
  image_url TEXT,
  is_compound BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  days_per_week INT NOT NULL DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  name TEXT NOT NULL
);

CREATE TABLE training_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES training_plan_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  sets INT NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '8-12',
  rest_seconds INT DEFAULT 90,
  notes TEXT
);

CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_day_id UUID REFERENCES training_plan_days(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  duration_minutes INT,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- CARDIO TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE cardio_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  default_met FLOAT NOT NULL
);

CREATE TABLE cardio_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cardio_type_id UUID NOT NULL REFERENCES cardio_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INT NOT NULL,
  avg_bpm INT,
  calories_burned INT NOT NULL DEFAULT 0,
  is_prescribed BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- WATER LOGS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_ml INT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'nutritionist')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritionist_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutritionist_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read/update their own, nutritionists can read their clients
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Nutritionists can view client profiles"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Nutritionist packages
CREATE POLICY "Nutritionists can manage own packages"
  ON nutritionist_packages FOR ALL
  USING (nutritionist_id = auth.uid());

-- Nutritionist clients
CREATE POLICY "Nutritionists can manage own clients"
  ON nutritionist_clients FOR ALL
  USING (nutritionist_id = auth.uid());

CREATE POLICY "Clients can view own relationship"
  ON nutritionist_clients FOR SELECT
  USING (client_id = auth.uid());

-- AI usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Diet plans: own + nutritionist's clients
CREATE POLICY "Users can manage own diet plans"
  ON diet_plans FOR ALL
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Nutritionists can manage client diet plans"
  ON diet_plans FOR ALL
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Diet plan meals: accessible if user has access to the plan
CREATE POLICY "Users can manage diet plan meals"
  ON diet_plan_meals FOR ALL
  USING (
    diet_plan_id IN (
      SELECT id FROM diet_plans
      WHERE user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Meal logs
CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Nutritionists can view client meal logs"
  ON meal_logs FOR SELECT
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Exercises: readable by all authenticated users
CREATE POLICY "Exercises are readable by all"
  ON exercises FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Training plans
CREATE POLICY "Users can manage own training plans"
  ON training_plans FOR ALL
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Nutritionists can manage client training plans"
  ON training_plans FOR ALL
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Training plan days
CREATE POLICY "Users can manage training plan days"
  ON training_plan_days FOR ALL
  USING (
    training_plan_id IN (
      SELECT id FROM training_plans
      WHERE user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Training plan exercises
CREATE POLICY "Users can manage training plan exercises"
  ON training_plan_exercises FOR ALL
  USING (
    plan_day_id IN (
      SELECT tpd.id FROM training_plan_days tpd
      JOIN training_plans tp ON tp.id = tpd.training_plan_id
      WHERE tp.user_id = auth.uid() OR tp.created_by = auth.uid()
    )
  );

-- Workout logs
CREATE POLICY "Users can manage own workout logs"
  ON workout_logs FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Nutritionists can view client workout logs"
  ON workout_logs FOR SELECT
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Cardio types: readable by all
CREATE POLICY "Cardio types are readable by all"
  ON cardio_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Cardio sessions
CREATE POLICY "Users can manage own cardio sessions"
  ON cardio_sessions FOR ALL
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Nutritionists can manage client cardio sessions"
  ON cardio_sessions FOR ALL
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Water logs
CREATE POLICY "Users can manage own water logs"
  ON water_logs FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Nutritionists can view client water logs"
  ON water_logs FOR SELECT
  USING (
    user_id IN (
      SELECT client_id FROM nutritionist_clients
      WHERE nutritionist_id = auth.uid() AND status = 'active'
    )
  );

-- Subscriptions
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: CARDIO TYPES
-- ═══════════════════════════════════════════════════════════

INSERT INTO cardio_types (name, default_met) VALUES
  ('Running', 9.8),
  ('Cycling', 7.5),
  ('Swimming', 8.0),
  ('Rowing', 7.0),
  ('Elliptical', 5.0),
  ('Jump Rope', 12.3),
  ('Walking', 3.8),
  ('HIIT', 8.0),
  ('Stair Climbing', 9.0),
  ('Dancing', 5.5);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: EXERCISES (5 per body part)
-- ═══════════════════════════════════════════════════════════

INSERT INTO exercises (name, body_part, equipment, description, is_compound) VALUES
  -- Chest
  ('Bench Press', 'chest', 'barbell', 'Flat barbell bench press targeting the pectorals', TRUE),
  ('Incline Dumbbell Press', 'chest', 'dumbbell', 'Incline press targeting upper chest', TRUE),
  ('Cable Fly', 'chest', 'cable', 'Cable crossover fly for chest isolation', FALSE),
  ('Push-Up', 'chest', 'bodyweight', 'Classic bodyweight chest exercise', TRUE),
  ('Chest Dip', 'chest', 'bodyweight', 'Dip with forward lean for chest emphasis', TRUE),
  -- Back
  ('Deadlift', 'back', 'barbell', 'Conventional deadlift for posterior chain', TRUE),
  ('Pull-Up', 'back', 'bodyweight', 'Overhand grip pull-up for lats', TRUE),
  ('Barbell Row', 'back', 'barbell', 'Bent-over barbell row for back thickness', TRUE),
  ('Lat Pulldown', 'back', 'cable', 'Cable lat pulldown for lat width', FALSE),
  ('Seated Cable Row', 'back', 'cable', 'Seated row for mid-back', FALSE),
  -- Shoulders
  ('Overhead Press', 'shoulders', 'barbell', 'Standing barbell overhead press', TRUE),
  ('Lateral Raise', 'shoulders', 'dumbbell', 'Dumbbell lateral raise for side delts', FALSE),
  ('Face Pull', 'shoulders', 'cable', 'Cable face pull for rear delts and rotator cuff', FALSE),
  ('Arnold Press', 'shoulders', 'dumbbell', 'Rotating dumbbell press', TRUE),
  ('Reverse Fly', 'shoulders', 'dumbbell', 'Bent-over reverse fly for rear delts', FALSE),
  -- Biceps
  ('Barbell Curl', 'biceps', 'barbell', 'Standing barbell curl', FALSE),
  ('Hammer Curl', 'biceps', 'dumbbell', 'Neutral grip dumbbell curl', FALSE),
  ('Preacher Curl', 'biceps', 'barbell', 'Preacher bench barbell curl', FALSE),
  ('Incline Dumbbell Curl', 'biceps', 'dumbbell', 'Incline bench dumbbell curl for stretch', FALSE),
  ('Cable Curl', 'biceps', 'cable', 'Standing cable curl', FALSE),
  -- Triceps
  ('Tricep Pushdown', 'triceps', 'cable', 'Cable rope pushdown', FALSE),
  ('Skull Crusher', 'triceps', 'barbell', 'Lying barbell tricep extension', FALSE),
  ('Overhead Extension', 'triceps', 'dumbbell', 'Overhead dumbbell tricep extension', FALSE),
  ('Diamond Push-Up', 'triceps', 'bodyweight', 'Close-grip push-up for triceps', TRUE),
  ('Dip', 'triceps', 'bodyweight', 'Upright dip for tricep emphasis', TRUE),
  -- Legs
  ('Squat', 'legs', 'barbell', 'Barbell back squat', TRUE),
  ('Leg Press', 'legs', 'machine', 'Machine leg press', TRUE),
  ('Romanian Deadlift', 'legs', 'barbell', 'Stiff-leg deadlift for hamstrings', TRUE),
  ('Leg Curl', 'legs', 'machine', 'Seated or lying leg curl', FALSE),
  ('Calf Raise', 'legs', 'machine', 'Standing or seated calf raise', FALSE),
  -- Core
  ('Plank', 'core', 'bodyweight', 'Isometric core hold', FALSE),
  ('Hanging Leg Raise', 'core', 'bodyweight', 'Hanging leg raise for lower abs', FALSE),
  ('Cable Crunch', 'core', 'cable', 'Kneeling cable crunch', FALSE),
  ('Russian Twist', 'core', 'bodyweight', 'Seated twisting core exercise', FALSE),
  ('Ab Wheel', 'core', 'bodyweight', 'Ab wheel rollout', FALSE),
  -- Full Body
  ('Clean & Press', 'full_body', 'barbell', 'Power clean to overhead press', TRUE),
  ('Burpee', 'full_body', 'bodyweight', 'Full body explosive exercise', TRUE),
  ('Turkish Get-Up', 'full_body', 'dumbbell', 'Floor-to-standing unilateral movement', TRUE),
  ('Thruster', 'full_body', 'barbell', 'Front squat to overhead press', TRUE),
  ('Kettlebell Swing', 'full_body', 'dumbbell', 'Hip-hinge swing pattern', TRUE);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_nutritionist_clients_nutritionist ON nutritionist_clients(nutritionist_id);
CREATE INDEX idx_nutritionist_clients_client ON nutritionist_clients(client_id);
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at);
CREATE INDEX idx_diet_plans_user ON diet_plans(user_id);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, date);
CREATE INDEX idx_training_plans_user ON training_plans(user_id);
CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, date);
CREATE INDEX idx_cardio_sessions_user_date ON cardio_sessions(user_id, date);
CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, date);
CREATE INDEX idx_exercises_body_part ON exercises(body_part);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);


-- ============================================================
-- 002_add_meal_log_plan_reference.sql
-- ============================================================
-- Add reference from meal_logs to diet_plan_meals
-- This allows tracking which plan meal was checked off

ALTER TABLE meal_logs
  ADD COLUMN diet_plan_meal_id UUID REFERENCES diet_plan_meals(id) ON DELETE SET NULL;

CREATE INDEX idx_meal_logs_plan_meal ON meal_logs(diet_plan_meal_id);


-- ============================================================
-- 003_add_schedule_fields.sql
-- ============================================================
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


-- ============================================================
-- 004_messaging_and_feedback.sql
-- ============================================================
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


-- ============================================================
-- 005_expand_meals_per_day.sql
-- ============================================================
-- 005: Expand meals_per_day constraint to allow up to 7 meals
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_meals_per_day_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_meals_per_day_check CHECK (meals_per_day BETWEEN 2 AND 7);


-- ============================================================
-- 006_exercises_insert_policy.sql
-- ============================================================
-- 006: Allow authenticated users to insert exercises
-- Needed for AI-generated training plans to create new exercises
CREATE POLICY "Authenticated users can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================
-- 007_weight_logs.sql
-- ============================================================
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


-- ============================================================
-- 008_supplements.sql
-- ============================================================
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


-- ============================================================
-- 009_favourite_foods.sql
-- ============================================================
-- Add favourite foods column for AI meal plan personalization
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS favourite_foods TEXT[] DEFAULT '{}';


-- ============================================================
-- 010_tier_gating.sql
-- ============================================================
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


-- ============================================================
-- 011_dev_default_pro.sql
-- ============================================================
-- DEV ONLY: Default new users to 'pro' for testing
-- REVERT BEFORE PRODUCTION: Change 'pro' back to 'free'

-- Change column default
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'pro';

-- Update the auto-create trigger to explicitly set role = 'pro'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'pro');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 012_work_schedule_fields.sql
-- ============================================================
-- Add work schedule fields for better meal timing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '17:00';


-- ============================================================
-- 013_nutritionist_client_role.sql
-- ============================================================
-- Add 'nutritionist_client' role for clients managed by nutritionists
-- These users get Pro-level access minus AI features

-- Expand role constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'));

-- Add nutritionist_id so clients can look up their nutritionist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES user_profiles(id);

-- Expand subscription plan_type constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'unlimited', 'nutritionist', 'nutritionist_client'));


-- ============================================================
-- 014_ai_generated_flag.sql
-- ============================================================
-- Add is_ai_generated flag to diet and training plans
-- so free users can see all meals/days in manually-created plans.

ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Mark existing plans created via AI generation as ai-generated
-- (plans created by generate-plans page have 'AI Meal Plan' in the name)
UPDATE diet_plans SET is_ai_generated = TRUE WHERE name LIKE '%AI Meal Plan%';
UPDATE training_plans SET is_ai_generated = TRUE WHERE name LIKE '%AI Training Plan%';


-- ============================================================
-- 015_progress_photos_measurements.sql
-- ============================================================
-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT NOT NULL,
  pose TEXT NOT NULL DEFAULT 'front' CHECK (pose IN ('front', 'side', 'back')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists view client photos" ON progress_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_clients nc
      WHERE nc.nutritionist_id = auth.uid()
        AND nc.client_id = progress_photos.user_id
        AND nc.status = 'active'
    )
  );

-- Body measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  neck FLOAT,
  shoulders FLOAT,
  chest FLOAT,
  left_arm FLOAT,
  right_arm FLOAT,
  waist FLOAT,
  hips FLOAT,
  left_thigh FLOAT,
  right_thigh FLOAT,
  left_calf FLOAT,
  right_calf FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists view client measurements" ON body_measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_clients nc
      WHERE nc.nutritionist_id = auth.uid()
        AND nc.client_id = body_measurements.user_id
        AND nc.status = 'active'
    )
  );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);


-- ============================================================
-- 016_add_profile_columns.sql
-- ============================================================
-- 016: Add missing profile columns
-- body_fat_pct, years_training for enhanced onboarding
-- breakfast_time, lunch_time, dinner_time for meal scheduling
-- cardio preferences for coaching and plan generation

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS body_fat_pct FLOAT,
  ADD COLUMN IF NOT EXISTS years_training FLOAT,
  ADD COLUMN IF NOT EXISTS breakfast_time TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS lunch_time TIME DEFAULT '12:30',
  ADD COLUMN IF NOT EXISTS dinner_time TIME DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS does_cardio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cardio_types_preferred TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cardio_frequency_per_week INT,
  ADD COLUMN IF NOT EXISTS cardio_duration_minutes INT;


-- ============================================================
-- 017_training_check_ins.sql
-- ============================================================
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


-- ============================================================
-- 018_default_unlimited.sql
-- ============================================================
-- Default new users to 'unlimited' so everyone gets full access
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'unlimited';

-- Update the auto-create trigger to set role = 'unlimited'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'unlimited');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upgrade all existing users to unlimited
UPDATE user_profiles SET role = 'unlimited' WHERE role IN ('free', 'pro');


-- ============================================================
-- 020_pro_trial.sql
-- ============================================================
-- Migration 020: Add trial_ends_at to user_profiles for 7-day Pro trial
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;


-- ============================================================
-- 021_personal_trainer_invites.sql
-- ============================================================
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


-- ============================================================
-- 022_beta_events.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS beta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  account_role TEXT,
  event_name TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE beta_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own beta events" ON beta_events;
CREATE POLICY "Users can view own beta events"
  ON beta_events FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages beta events" ON beta_events;
CREATE POLICY "Service role manages beta events"
  ON beta_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_beta_events_user_id ON beta_events(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_events_event_name ON beta_events(event_name);
CREATE INDEX IF NOT EXISTS idx_beta_events_created_at ON beta_events(created_at DESC);

CREATE OR REPLACE FUNCTION log_beta_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_entity_table TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_role
    FROM user_profiles
    WHERE id = p_user_id;
  END IF;

  INSERT INTO beta_events (user_id, account_role, event_name, entity_table, entity_id, metadata)
  VALUES (p_user_id, v_role, p_event_name, p_entity_table, p_entity_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION capture_personal_trainer_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('personal_trainer', 'nutritionist') THEN
    PERFORM log_beta_event(
      NEW.id,
      'pt_signup',
      'user_profiles',
      NEW.id,
      jsonb_build_object('email', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_personal_trainer_signup ON user_profiles;
CREATE TRIGGER trg_capture_personal_trainer_signup
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION capture_personal_trainer_signup();

CREATE OR REPLACE FUNCTION capture_invite_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_beta_event(
      NEW.personal_trainer_id,
      'client_invite_sent',
      'personal_trainer_invites',
      NEW.id,
      jsonb_build_object('invited_email', NEW.invited_email, 'status', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_accepted',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    ELSIF NEW.status = 'declined' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_declined',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    ELSIF NEW.status = 'expired' THEN
      PERFORM log_beta_event(
        NEW.personal_trainer_id,
        'client_invite_expired',
        'personal_trainer_invites',
        NEW.id,
        jsonb_build_object('invited_email', NEW.invited_email)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_invite_events ON personal_trainer_invites;
CREATE TRIGGER trg_capture_invite_events
AFTER INSERT OR UPDATE ON personal_trainer_invites
FOR EACH ROW
EXECUTE FUNCTION capture_invite_events();

CREATE OR REPLACE FUNCTION capture_plan_assignment_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.created_by <> NEW.user_id THEN
    IF TG_TABLE_NAME = 'diet_plans' THEN
      PERFORM log_beta_event(
        NEW.created_by,
        'diet_plan_assigned',
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('client_id', NEW.user_id, 'is_active', NEW.is_active)
      );
    ELSIF TG_TABLE_NAME = 'training_plans' THEN
      PERFORM log_beta_event(
        NEW.created_by,
        'training_plan_assigned',
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('client_id', NEW.user_id, 'is_active', NEW.is_active)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_diet_plan_assignment_events ON diet_plans;
CREATE TRIGGER trg_capture_diet_plan_assignment_events
AFTER INSERT ON diet_plans
FOR EACH ROW
EXECUTE FUNCTION capture_plan_assignment_events();

DROP TRIGGER IF EXISTS trg_capture_training_plan_assignment_events ON training_plans;
CREATE TRIGGER trg_capture_training_plan_assignment_events
AFTER INSERT ON training_plans
FOR EACH ROW
EXECUTE FUNCTION capture_plan_assignment_events();

CREATE OR REPLACE FUNCTION capture_first_time_user_events()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
  v_event_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'meal_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM meal_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_meal_logged';
  ELSIF TG_TABLE_NAME = 'workout_logs' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM workout_logs
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;
    v_event_name := 'first_workout_logged';
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM messages
    WHERE sender_id = NEW.sender_id
      AND id <> NEW.id;
    v_event_name := 'first_message_sent';
  ELSE
    RETURN NEW;
  END IF;

  IF v_existing_count = 0 THEN
    PERFORM log_beta_event(
      COALESCE(NEW.user_id, NEW.sender_id),
      v_event_name,
      TG_TABLE_NAME,
      NEW.id,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_first_meal_logged ON meal_logs;
CREATE TRIGGER trg_capture_first_meal_logged
AFTER INSERT ON meal_logs
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

DROP TRIGGER IF EXISTS trg_capture_first_workout_logged ON workout_logs;
CREATE TRIGGER trg_capture_first_workout_logged
AFTER INSERT ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

DROP TRIGGER IF EXISTS trg_capture_first_message_sent ON messages;
CREATE TRIGGER trg_capture_first_message_sent
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION capture_first_time_user_events();

CREATE OR REPLACE FUNCTION capture_feedback_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM feedback_requests
    WHERE client_id = NEW.client_id
      AND status = 'completed'
      AND id <> NEW.id;

    IF v_existing_count = 0 THEN
      PERFORM log_beta_event(
        NEW.client_id,
        'first_feedback_completed',
        'feedback_requests',
        NEW.id,
        jsonb_build_object('trainer_id', NEW.nutritionist_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_feedback_completed ON feedback_requests;
CREATE TRIGGER trg_capture_feedback_completed
AFTER UPDATE ON feedback_requests
FOR EACH ROW
EXECUTE FUNCTION capture_feedback_completed();


-- ============================================================
-- 023_support_requests.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT,
  account_role TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  category TEXT NOT NULL DEFAULT 'bug',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create support requests" ON support_requests;
CREATE POLICY "Users can create support requests"
  ON support_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
CREATE POLICY "Users can view own support requests"
  ON support_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages support requests" ON support_requests;
CREATE POLICY "Service role manages support requests"
  ON support_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

CREATE OR REPLACE FUNCTION set_support_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_support_requests_updated_at ON support_requests;
CREATE TRIGGER trg_set_support_requests_updated_at
BEFORE UPDATE ON support_requests
FOR EACH ROW
EXECUTE FUNCTION set_support_requests_updated_at();


-- ============================================================
-- 024_behavioral_intake_fields.sql
-- ============================================================
-- 024: behavioural intake fields for premium nutritionist-style onboarding

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS desired_outcome TEXT,
  ADD COLUMN IF NOT EXISTS past_dieting_challenges TEXT,
  ADD COLUMN IF NOT EXISTS weekly_derailers TEXT,
  ADD COLUMN IF NOT EXISTS plan_preference TEXT DEFAULT 'balanced'
    CHECK (plan_preference IN ('structured', 'balanced', 'flexible')),
  ADD COLUMN IF NOT EXISTS harder_days TEXT DEFAULT 'weekends'
    CHECK (harder_days IN ('weekdays', 'weekends', 'both')),
  ADD COLUMN IF NOT EXISTS eating_out_frequency TEXT DEFAULT 'sometimes'
    CHECK (eating_out_frequency IN ('rarely', 'sometimes', 'often', 'very_often'));


-- ============================================================
-- 025_trainer_onboarding_fields.sql
-- ============================================================
-- 025: trainer onboarding configuration fields

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS coach_specialties TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS coach_ideal_client TEXT,
  ADD COLUMN IF NOT EXISTS coach_services TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS coach_formats TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS coach_check_in_frequency TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS coach_style TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS coach_intake_requirements TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS coach_post_intake_action TEXT DEFAULT 'review_and_plan',
  ADD COLUMN IF NOT EXISTS coach_app_focus TEXT DEFAULT 'client_management';


-- ============================================================
-- 026_custom_intake_questions.sql
-- ============================================================
-- 026: coach custom intake questions and client responses

CREATE TABLE IF NOT EXISTS personal_trainer_custom_intake_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  help_text TEXT,
  type TEXT NOT NULL CHECK (type IN ('short_text', 'long_text', 'single_select', 'multi_select', 'yes_no')),
  options TEXT[] NOT NULL DEFAULT '{}'::text[],
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_custom_intake_questions_trainer
  ON personal_trainer_custom_intake_questions(trainer_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS personal_trainer_custom_intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES personal_trainer_custom_intake_questions(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  response_text TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_pt_custom_intake_responses_client
  ON personal_trainer_custom_intake_responses(client_id, trainer_id);


-- ============================================================
-- 027_coach_marketplace.sql
-- ============================================================
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


-- ============================================================
-- 028_coach_marketplace_crm.sql
-- ============================================================
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


-- ============================================================
-- 029_custom_intake_rls.sql
-- ============================================================
-- 029: row-level security for trainer custom intake tables

ALTER TABLE public.personal_trainer_custom_intake_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_trainer_custom_intake_responses ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own custom intake questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_questions_manage_own
  ON public.personal_trainer_custom_intake_questions;
CREATE POLICY personal_trainer_custom_intake_questions_manage_own
  ON public.personal_trainer_custom_intake_questions
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Assigned clients can read the active questions for their trainer.
DROP POLICY IF EXISTS personal_trainer_custom_intake_questions_select_assigned_client
  ON public.personal_trainer_custom_intake_questions;
CREATE POLICY personal_trainer_custom_intake_questions_select_assigned_client
  ON public.personal_trainer_custom_intake_questions
  FOR SELECT
  USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_questions.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_questions.trainer_id
      )
    )
  );

-- Clients can read only their own custom intake responses.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_select_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_select_own
  ON public.personal_trainer_custom_intake_responses
  FOR SELECT
  USING (
    client_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );

-- Trainers can read responses for their own assigned clients.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_select_trainer
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_select_trainer
  ON public.personal_trainer_custom_intake_responses
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = personal_trainer_custom_intake_responses.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = personal_trainer_custom_intake_responses.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  );

-- Clients can insert responses only for their own trainer's questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_insert_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_insert_own
  ON public.personal_trainer_custom_intake_responses
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.personal_trainer_custom_intake_questions q
      WHERE q.id = personal_trainer_custom_intake_responses.question_id
        AND q.trainer_id = personal_trainer_custom_intake_responses.trainer_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );

-- Clients can update only their own responses for their trainer's questions.
DROP POLICY IF EXISTS personal_trainer_custom_intake_responses_update_own
  ON public.personal_trainer_custom_intake_responses;
CREATE POLICY personal_trainer_custom_intake_responses_update_own
  ON public.personal_trainer_custom_intake_responses
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.personal_trainer_custom_intake_questions q
      WHERE q.id = personal_trainer_custom_intake_responses.question_id
        AND q.trainer_id = personal_trainer_custom_intake_responses.trainer_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.client_id = auth.uid()
          AND nc.nutritionist_id = personal_trainer_custom_intake_responses.trainer_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = personal_trainer_custom_intake_responses.trainer_id
      )
    )
  );


-- ============================================================
-- 030_coach_wizard_and_waitlist.sql
-- ============================================================
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


-- ============================================================
-- 031_client_read_trainer_profile.sql
-- ============================================================
-- Allow clients to read their trainer's profile
-- Currently only trainers can view client profiles, but clients need
-- to see their trainer's name/email on the my-nutritionist page.

CREATE POLICY "Clients can view their trainer profile"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT COALESCE(personal_trainer_id, nutritionist_id)
      FROM user_profiles
      WHERE id = auth.uid()
        AND COALESCE(personal_trainer_id, nutritionist_id) IS NOT NULL
    )
  );


-- ============================================================
-- 032_fix_client_read_trainer_profile_recursion.sql
-- ============================================================
-- Fix infinite recursion in the "Clients can view their trainer profile" policy
-- introduced in 031. The original policy's USING clause subqueries user_profiles,
-- which re-triggers RLS evaluation on the same table → infinite recursion →
-- every user_profiles query fails → useUser() hangs → app stalls.
--
-- Replace with a SECURITY DEFINER function that reads the caller's trainer id
-- without going through RLS, and rewrite the policy to compare against it.

DROP POLICY IF EXISTS "Clients can view their trainer profile" ON user_profiles;

CREATE OR REPLACE FUNCTION public.get_my_trainer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(personal_trainer_id, nutritionist_id)
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_trainer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_trainer_id() TO authenticated;

CREATE POLICY "Clients can view their trainer profile"
  ON user_profiles FOR SELECT
  USING (
    id = public.get_my_trainer_id()
  );


-- ============================================================
-- 033_foods_table.sql
-- ============================================================
-- Enable trigram search for fuzzy food name matching
create extension if not exists pg_trgm with schema public;

-- Local food database: caches external lookups and stores PT custom foods
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  source text not null check (source in ('spoonacular', 'openfoodfacts', 'custom', 'ai_parsed')),
  external_id text,
  barcode text,
  calories_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  default_amount numeric not null default 100,
  default_unit text not null default 'g',
  created_by uuid references auth.users(id),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_foods_name_trgm on public.foods using gin (name gin_trgm_ops);
create index idx_foods_source on public.foods (source);
create unique index idx_foods_external_id on public.foods (source, external_id) where external_id is not null;
create index idx_foods_barcode on public.foods (barcode) where barcode is not null;
create index idx_foods_created_by on public.foods (created_by) where created_by is not null;

alter table public.foods enable row level security;

-- Everyone can read verified foods and foods from external sources
create policy "Anyone can read verified or external foods"
  on public.foods for select
  using (is_verified = true or source in ('spoonacular', 'openfoodfacts'));

-- Users can read their own custom foods
create policy "Users can read own custom foods"
  on public.foods for select
  using (auth.uid() = created_by);

-- Trainers can create custom foods
create policy "Users can insert custom foods"
  on public.foods for insert
  with check (auth.uid() = created_by and source = 'custom');

-- Trainers can update their own custom foods
create policy "Users can update own custom foods"
  on public.foods for update
  using (auth.uid() = created_by and source = 'custom');

-- Trainers can delete their own custom foods
create policy "Users can delete own custom foods"
  on public.foods for delete
  using (auth.uid() = created_by and source = 'custom');

-- Service role can insert cached foods from external APIs
-- (handled by supabase service role key in API routes)

-- Pre-seed common gym foods with accurate per-100g macros
insert into public.foods (name, source, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_amount, default_unit, is_verified) values
  ('White rice (cooked)', 'custom', 130, 2.7, 28.2, 0.3, 200, 'g', true),
  ('Brown rice (cooked)', 'custom', 123, 2.7, 25.6, 1.0, 200, 'g', true),
  ('Chicken breast (cooked)', 'custom', 165, 31.0, 0, 3.6, 150, 'g', true),
  ('Potato (boiled)', 'custom', 87, 1.9, 20.1, 0.1, 200, 'g', true),
  ('Sweet potato (boiled)', 'custom', 90, 2.0, 20.7, 0.2, 200, 'g', true),
  ('Pasta (cooked)', 'custom', 131, 5.0, 25.0, 1.1, 200, 'g', true),
  ('Whey protein powder', 'custom', 380, 80.0, 6.0, 5.0, 30, 'g', true),
  ('Oats (dry)', 'custom', 389, 16.9, 66.3, 6.9, 50, 'g', true),
  ('Whole egg (raw)', 'custom', 155, 13.0, 1.1, 11.0, 50, 'g', true),
  ('Egg white (raw)', 'custom', 52, 11.0, 0.7, 0.2, 100, 'g', true),
  ('Banana', 'custom', 89, 1.1, 22.8, 0.3, 120, 'g', true),
  ('Peanut butter', 'custom', 588, 25.0, 20.0, 50.0, 32, 'g', true),
  ('Apple', 'custom', 52, 0.3, 13.8, 0.2, 180, 'g', true),
  ('Strawberries', 'custom', 32, 0.7, 7.7, 0.3, 150, 'g', true),
  ('Blueberries', 'custom', 57, 0.7, 14.5, 0.3, 100, 'g', true),
  ('Salmon fillet (cooked)', 'custom', 208, 20.4, 0, 13.4, 150, 'g', true),
  ('Ground beef 90/10 (cooked)', 'custom', 217, 26.1, 0, 11.8, 150, 'g', true),
  ('Greek yogurt (plain, 0% fat)', 'custom', 59, 10.2, 3.6, 0.4, 170, 'g', true),
  ('Olive oil', 'custom', 884, 0, 0, 100.0, 15, 'ml', true),
  ('Avocado', 'custom', 160, 2.0, 8.5, 14.7, 100, 'g', true),
  ('Broccoli (cooked)', 'custom', 35, 2.4, 7.2, 0.4, 150, 'g', true),
  ('Spinach (raw)', 'custom', 23, 2.9, 3.6, 0.4, 50, 'g', true),
  ('Almonds', 'custom', 579, 21.2, 21.6, 49.9, 30, 'g', true),
  ('Cottage cheese (low fat)', 'custom', 72, 12.4, 2.7, 1.0, 150, 'g', true),
  ('Tuna (canned in water)', 'custom', 116, 25.5, 0, 0.8, 100, 'g', true);


-- ============================================================
-- 034_avatars_bucket.sql
-- ============================================================
-- Create avatars storage bucket for coach/user profile pictures
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own avatar
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access for all avatars
create policy "Public avatar read access"
  on storage.objects for select
  using (bucket_id = 'avatars');


-- ============================================================
-- 035_check_in_templates_and_scheduling.sql
-- ============================================================
-- Reusable check-in templates for trainers
create table if not exists public.feedback_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  questions jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_feedback_templates_trainer on public.feedback_templates (trainer_id);

alter table public.feedback_templates enable row level security;

create policy "Trainers can manage own templates"
  on public.feedback_templates for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- Scheduled check-in configuration per client
create table if not exists public.feedback_schedules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.feedback_templates(id) on delete cascade,
  day_of_week int not null default 0 check (day_of_week between 0 and 6),
  recurrence text not null default 'weekly' check (recurrence in ('weekly', 'biweekly', 'monthly')),
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index idx_feedback_schedules_active on public.feedback_schedules (is_active, day_of_week) where is_active = true;

alter table public.feedback_schedules enable row level security;

create policy "Trainers can manage own schedules"
  on public.feedback_schedules for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "Clients can view own schedules"
  on public.feedback_schedules for select
  using (auth.uid() = client_id);

-- Extend feedback_requests with template and schedule references
alter table public.feedback_requests
  add column if not exists template_id uuid references public.feedback_templates(id) on delete set null,
  add column if not exists schedule_id uuid references public.feedback_schedules(id) on delete set null;

-- Extend the question type check: allow 'photo' and 'rating_10' in addition to existing types
-- (question types are stored in JSONB so no DB constraint needed, only app-level validation)

-- Allow clients to read feedback templates (to display question labels in their response UI)
create policy "Clients can read templates used in their feedback"
  on public.feedback_templates for select
  using (
    exists (
      select 1 from public.feedback_requests fr
      where fr.template_id = feedback_templates.id
        and fr.client_id = auth.uid()
    )
  );


-- ============================================================
-- 048_supplement_plans.sql
-- ============================================================
-- 048: coach-prescribed supplement plans

CREATE TABLE IF NOT EXISTS public.supplement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplement_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.supplement_plans(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  dosage TEXT,
  unit TEXT,
  frequency TEXT,
  time_of_day TEXT,
  with_food BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplement_plans_client_active
  ON public.supplement_plans(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_coach
  ON public.supplement_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plan_items_plan
  ON public.supplement_plan_items(plan_id, sort_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_supplement_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS supplement_plans_set_updated_at ON public.supplement_plans;
CREATE TRIGGER supplement_plans_set_updated_at
  BEFORE UPDATE ON public.supplement_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_supplement_plans_updated_at();


-- ============================================================
-- 049_supplement_plans_rls.sql
-- ============================================================
-- 049: row-level security for coach supplement plans

ALTER TABLE public.supplement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_plan_items ENABLE ROW LEVEL SECURITY;

-- ─── supplement_plans policies ────────────────────────────

-- Coach can manage plans they own for their assigned clients.
DROP POLICY IF EXISTS supplement_plans_coach_manage ON public.supplement_plans;
CREATE POLICY supplement_plans_coach_manage
  ON public.supplement_plans
  FOR ALL
  USING (
    coach_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = supplement_plans.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = supplement_plans.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  )
  WITH CHECK (
    coach_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.nutritionist_clients nc
        WHERE nc.nutritionist_id = auth.uid()
          AND nc.client_id = supplement_plans.client_id
          AND nc.status = 'active'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = supplement_plans.client_id
          AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
      )
    )
  );

-- Client can read their own plans (read-only).
DROP POLICY IF EXISTS supplement_plans_client_select ON public.supplement_plans;
CREATE POLICY supplement_plans_client_select
  ON public.supplement_plans
  FOR SELECT
  USING (client_id = auth.uid());

-- ─── supplement_plan_items policies (inherit via plan) ────

DROP POLICY IF EXISTS supplement_plan_items_coach_manage ON public.supplement_plan_items;
CREATE POLICY supplement_plan_items_coach_manage
  ON public.supplement_plan_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.coach_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.nutritionist_clients nc
            WHERE nc.nutritionist_id = auth.uid()
              AND nc.client_id = p.client_id
              AND nc.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = p.client_id
              AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.coach_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.nutritionist_clients nc
            WHERE nc.nutritionist_id = auth.uid()
              AND nc.client_id = p.client_id
              AND nc.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = p.client_id
              AND COALESCE(up.personal_trainer_id, up.nutritionist_id) = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS supplement_plan_items_client_select ON public.supplement_plan_items;
CREATE POLICY supplement_plan_items_client_select
  ON public.supplement_plan_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supplement_plans p
      WHERE p.id = supplement_plan_items.plan_id
        AND p.client_id = auth.uid()
    )
  );


-- ============================================================
-- 052_cardio_plans.sql
-- ============================================================
-- Coach-prescribed cardio plans (mirrors training_plans structure).
-- Plans hold weekly recurring prescriptive cardio sessions tied to a day of week.
-- Existing ad-hoc cardio_sessions logging is unaffected.

create table if not exists public.cardio_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cardio_plans_coach on public.cardio_plans (coach_id);
create index if not exists idx_cardio_plans_client on public.cardio_plans (client_id);
create index if not exists idx_cardio_plans_active on public.cardio_plans (client_id, is_active) where is_active = true;

create table if not exists public.cardio_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.cardio_plans(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  type text not null,
  duration_minutes int not null check (duration_minutes > 0),
  intensity text not null default 'moderate',
  target_zone text,
  target_hr_min int,
  target_hr_max int,
  notes text,
  sort_order int not null default 0
);

create index if not exists idx_cardio_plan_sessions_plan on public.cardio_plan_sessions (plan_id);
create index if not exists idx_cardio_plan_sessions_dow on public.cardio_plan_sessions (plan_id, day_of_week);

-- Updated-at trigger for cardio_plans (reuses existing update_updated_at function)
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'cardio_plans_updated_at'
  ) then
    create trigger cardio_plans_updated_at
      before update on public.cardio_plans
      for each row execute function update_updated_at();
  end if;
end $$;

-- ─── Row Level Security ─────────────────────────────────
alter table public.cardio_plans enable row level security;
alter table public.cardio_plan_sessions enable row level security;

-- Coach can manage own plans
create policy "Coaches can manage own cardio plans"
  on public.cardio_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Coach can manage plans for their active clients (via nutritionist_clients)
create policy "Coaches can manage cardio plans for active clients"
  on public.cardio_plans for all
  using (
    client_id in (
      select client_id from public.nutritionist_clients
      where nutritionist_id = auth.uid() and status = 'active'
    )
  )
  with check (
    client_id in (
      select client_id from public.nutritionist_clients
      where nutritionist_id = auth.uid() and status = 'active'
    )
  );

-- Client can view own cardio plans (read-only)
create policy "Clients can view own cardio plans"
  on public.cardio_plans for select
  using (client_id = auth.uid());

-- Sessions inherit access from parent plan (coach manage, client read)
create policy "Coaches can manage own cardio plan sessions"
  on public.cardio_plan_sessions for all
  using (
    plan_id in (
      select id from public.cardio_plans where coach_id = auth.uid()
    )
  )
  with check (
    plan_id in (
      select id from public.cardio_plans where coach_id = auth.uid()
    )
  );

create policy "Clients can view own cardio plan sessions"
  on public.cardio_plan_sessions for select
  using (
    plan_id in (
      select id from public.cardio_plans where client_id = auth.uid()
    )
  );


-- ============================================================
-- 053_ai_usage_types.sql
-- ============================================================
-- Migration 053: Expand ai_usage.type values.
-- 'coaching' rows (AI coaching hub, training check-ins) were silently failing
-- the old CHECK constraint. 'ai_suggest' separates one-off meal suggestions
-- from plan generation so they don't consume the regeneration cooldown.

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_type_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_type_check
  CHECK (type IN ('meal_suggestion', 'workout_suggestion', 'coaching', 'ai_suggest'));


-- ============================================================
-- 054_protect_profile_role.sql
-- ============================================================
-- Migration 054: Prevent self-service privilege escalation.
-- The "Users can update own profile" RLS policy allows updating any column,
-- including role — so any user could grant themselves 'unlimited' with the
-- public anon key. This trigger blocks changes to protected billing fields
-- unless the request comes from the service role (server-side admin client).

CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  -- Service-role (and direct/postgres) connections may change anything.
  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Changing trial_ends_at is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_billing_fields ON user_profiles;
CREATE TRIGGER protect_profile_billing_fields
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing_fields();


-- ============================================================
-- 055_signup_default_free.sql
-- ============================================================
-- Migration 055: New signups default to 'free' again.
-- Reverts the beta-era defaults from 011 (pro) and 018 (unlimited), which
-- made every signup bypass billing entirely. The trigger now also respects
-- the signup role metadata so coach signups land as 'personal_trainer'
-- (mirrors ALLOWED_BOOTSTRAP_ROLES in src/lib/billing.ts).
--
-- Existing users are intentionally NOT downgraded — beta testers keep
-- their current role.

ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role TEXT := NEW.raw_user_meta_data->>'role';
  bootstrap_role TEXT;
BEGIN
  IF meta_role IN ('free', 'personal_trainer') THEN
    bootstrap_role := meta_role;
  ELSE
    bootstrap_role := 'free';
  END IF;

  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    bootstrap_role,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 056_coach_waitlist_unique.sql
-- ============================================================
-- Migration 056: Deduplicate coach_waitlist and enforce unique emails.

DELETE FROM coach_waitlist a
USING coach_waitlist b
WHERE a.email = b.email
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_waitlist_email
  ON coach_waitlist (email);


-- ============================================================
-- 057_coach_reviews.sql
-- ============================================================
-- 057: coach reviews & ratings
--
-- Real social proof for the marketplace. A client may leave exactly one review
-- per coach, and only if they have (or had) a genuine coaching relationship —
-- an accepted marketplace lead, or a direct trainer/nutritionist assignment.
-- Reviews are immutable by the coach (integrity); the client owns their review.
-- Aggregate rating_avg / rating_count are denormalised onto coach_public_profiles
-- via trigger so the directory and match endpoints can sort/display cheaply.

-- ─── Relationship guard ─────────────────────────────────
-- SECURITY DEFINER so it can read coach_leads / user_profiles regardless of the
-- caller's RLS, without leaking row data (returns only a boolean).
CREATE OR REPLACE FUNCTION public.has_coaching_relationship(p_coach UUID, p_client UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_leads
    WHERE coach_id = p_coach AND user_id = p_client AND status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_client
      AND (personal_trainer_id = p_coach OR nutritionist_id = p_coach)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── Reviews table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_reviews_unique_client UNIQUE (coach_id, client_id),
  CONSTRAINT coach_reviews_no_self CHECK (coach_id <> client_id),
  CONSTRAINT coach_reviews_title_len CHECK (title IS NULL OR char_length(title) <= 120),
  CONSTRAINT coach_reviews_body_len CHECK (body IS NULL OR char_length(body) <= 2000)
);

DROP TRIGGER IF EXISTS coach_reviews_updated_at ON coach_reviews;
CREATE TRIGGER coach_reviews_updated_at
  BEFORE UPDATE ON coach_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coach_reviews_coach
  ON coach_reviews(coach_id, status, created_at DESC);

ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews; clients see their own; coaches see all of theirs.
DROP POLICY IF EXISTS coach_reviews_select ON coach_reviews;
CREATE POLICY coach_reviews_select
  ON coach_reviews FOR SELECT
  USING (status = 'published' OR client_id = auth.uid() OR coach_id = auth.uid());

-- A client may only post a review for a coach they actually worked with.
DROP POLICY IF EXISTS coach_reviews_insert_own ON coach_reviews;
CREATE POLICY coach_reviews_insert_own
  ON coach_reviews FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND public.has_coaching_relationship(coach_id, auth.uid())
  );

-- The client owns their review and can edit it. Coaches cannot alter reviews.
DROP POLICY IF EXISTS coach_reviews_update_own ON coach_reviews;
CREATE POLICY coach_reviews_update_own
  ON coach_reviews FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS coach_reviews_delete_own ON coach_reviews;
CREATE POLICY coach_reviews_delete_own
  ON coach_reviews FOR DELETE
  USING (client_id = auth.uid());

-- ─── Denormalised aggregates on the public profile ──────
ALTER TABLE coach_public_profiles
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2, 1),
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_coach_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_coach UUID := COALESCE(NEW.coach_id, OLD.coach_id);
BEGIN
  UPDATE coach_public_profiles p
  SET rating_avg = sub.avg_rating,
      rating_count = sub.cnt
  FROM (
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating,
           COUNT(*) AS cnt
    FROM coach_reviews
    WHERE coach_id = v_coach AND status = 'published'
  ) sub
  WHERE p.coach_id = v_coach;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS coach_reviews_refresh_rating ON coach_reviews;
CREATE TRIGGER coach_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON coach_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_coach_rating();


-- ============================================================
-- 058_coach_verification.sql
-- ============================================================
-- 058: honest coach verification
--
-- Adds a real verification state to coach profiles. The "VERIFIED" badge in the
-- marketplace must only appear when status = 'verified'. Coaches may *request*
-- review (move to 'pending') and attach a credential, but only the service role
-- (admin) can grant 'verified' / 'rejected' or stamp coach_verified_at. This is
-- enforced in the DB so it cannot be bypassed from the client.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS coach_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (coach_verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS coach_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_credential_url TEXT,
  ADD COLUMN IF NOT EXISTS coach_credential_note TEXT;

-- Extend the billing-field protection trigger (from 054) to also guard
-- verification. Keep the existing role / trial_ends_at guards intact.
CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  -- Service role (admin client) and trigger-less internal calls bypass guards.
  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Changing trial_ends_at is not allowed';
  END IF;

  -- A coach may request review (-> pending) or withdraw (-> unverified),
  -- but can never grant themselves 'verified' or set themselves 'rejected'.
  IF NEW.coach_verification_status IS DISTINCT FROM OLD.coach_verification_status
     AND NEW.coach_verification_status NOT IN ('pending', 'unverified') THEN
    RAISE EXCEPTION 'Changing verification status is not allowed';
  END IF;

  IF NEW.coach_verified_at IS DISTINCT FROM OLD.coach_verified_at THEN
    RAISE EXCEPTION 'Changing coach_verified_at is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

