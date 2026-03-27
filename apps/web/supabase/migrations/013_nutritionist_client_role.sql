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
