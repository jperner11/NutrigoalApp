-- 058: honest coach verification
--
-- Adds a real verification state to coach profiles. The "VERIFIED" badge in the
-- marketplace must only appear when status = 'verified'. Coaches may *request*
-- review (move to 'pending') and attach a credential, but only the service role
-- (admin) can grant 'verified' / 'rejected' or stamp coach_verified_at. This is
-- enforced in the DB so it cannot be bypassed from the client.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS coach_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (coach_verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS coach_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_credential_url TEXT,
  ADD COLUMN IF NOT EXISTS coach_credential_note TEXT;

-- Extend the billing-field protection trigger (from 054) to also guard
-- verification. Keep the existing role / trial_ends_at guards intact.
CREATE OR REPLACE FUNCTION public.protect_profile_billing_fields()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := current_setting('request.jwt.claims', true)::json->>'role';
BEGIN
  -- Service role (admin client) and trigger-less internal calls bypass guards.
  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Changing trial_ends_at is not allowed';
  END IF;

  -- A coach may request review (-> pending) or withdraw (-> unverified),
  -- but can never grant themselves 'verified' or set themselves 'rejected'.
  IF NEW.coach_verification_status IS DISTINCT FROM OLD.coach_verification_status
     AND NEW.coach_verification_status NOT IN ('pending', 'unverified') THEN
    RAISE EXCEPTION 'Changing verification status is not allowed';
  END IF;

  IF NEW.coach_verified_at IS DISTINCT FROM OLD.coach_verified_at THEN
    RAISE EXCEPTION 'Changing coach_verified_at is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
