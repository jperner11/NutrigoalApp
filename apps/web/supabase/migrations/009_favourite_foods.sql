-- Add favourite foods column for AI meal plan personalization
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS favourite_foods TEXT[] DEFAULT '{}';
