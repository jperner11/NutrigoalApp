-- 005: Expand meals_per_day constraint to allow up to 7 meals
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_meals_per_day_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_meals_per_day_check CHECK (meals_per_day BETWEEN 2 AND 7);
