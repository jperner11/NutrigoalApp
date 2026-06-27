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
