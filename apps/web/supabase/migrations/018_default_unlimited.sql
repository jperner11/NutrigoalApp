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
