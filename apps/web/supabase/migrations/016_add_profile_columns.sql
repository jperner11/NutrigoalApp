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
