-- Migration 054: Prevent self-service privilege escalation.
-- The "Users can update own profile" RLS policy allows updating any column,
-- including role — so any user could grant themselves 'unlimited' with the
-- public anon key. This trigger blocks changes to protected billing fields
-- unless the request comes from the service role (server-side admin client).

CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  -- Service-role (and direct/postgres) connections may change anything.
  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Changing trial_ends_at is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_billing_fields ON user_profiles;
CREATE TRIGGER protect_profile_billing_fields
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing_fields();
