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
