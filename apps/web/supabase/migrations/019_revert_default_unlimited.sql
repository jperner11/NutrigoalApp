-- Migration 019: Revert migration 018 — restore Free tier as default
-- Migration 018 set all users to 'unlimited', bypassing Stripe. This fixes it.

-- 1. Restore column default to 'free'
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'free';

-- 2. Restore handle_new_user trigger to create users on the Free tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Audit existing users: assign correct role based on active Stripe subscription.
--    - Users with an active or trialing subscription get the subscription plan_type as their role.
--    - Users with no active subscription revert to 'free'.
--    - Users with role 'nutritionist_client' are not subscription-driven — preserve their role.
UPDATE user_profiles up
SET role = s.plan_type
FROM subscriptions s
WHERE s.user_id = up.id
  AND s.status IN ('active', 'trialing')
  AND up.role != 'nutritionist_client';

-- Revert remaining non-client users who have no active subscription to 'free'
UPDATE user_profiles
SET role = 'free'
WHERE role = 'unlimited'
  AND id NOT IN (
    SELECT user_id FROM subscriptions
    WHERE status IN ('active', 'trialing')
  );

-- Also revert any 'pro' users who no longer have an active subscription
-- (migration 018 mass-upgraded free→pro→unlimited; some may have been 'pro' from migration 011)
UPDATE user_profiles
SET role = 'free'
WHERE role = 'pro'
  AND id NOT IN (
    SELECT user_id FROM subscriptions
    WHERE status IN ('active', 'trialing')
      AND plan_type = 'pro'
  )
  AND role != 'nutritionist_client';
