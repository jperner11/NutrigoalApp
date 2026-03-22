-- NutriGoal v2 - Initial Database Schema
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
