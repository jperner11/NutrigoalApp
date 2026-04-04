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
