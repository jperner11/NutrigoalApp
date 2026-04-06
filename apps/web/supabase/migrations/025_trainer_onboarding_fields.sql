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
