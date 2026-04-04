CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT,
  account_role TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  category TEXT NOT NULL DEFAULT 'bug',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create support requests" ON support_requests;
CREATE POLICY "Users can create support requests"
  ON support_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own support requests" ON support_requests;
CREATE POLICY "Users can view own support requests"
  ON support_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages support requests" ON support_requests;
CREATE POLICY "Service role manages support requests"
  ON support_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

CREATE OR REPLACE FUNCTION set_support_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_support_requests_updated_at ON support_requests;
CREATE TRIGGER trg_set_support_requests_updated_at
BEFORE UPDATE ON support_requests
FOR EACH ROW
EXECUTE FUNCTION set_support_requests_updated_at();
