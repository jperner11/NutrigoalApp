-- 057: coach reviews & ratings
--
-- Real social proof for the marketplace. A client may leave exactly one review
-- per coach, and only if they have (or had) a genuine coaching relationship —
-- an accepted marketplace lead, or a direct trainer/nutritionist assignment.
-- Reviews are immutable by the coach (integrity); the client owns their review.
-- Aggregate rating_avg / rating_count are denormalised onto coach_public_profiles
-- via trigger so the directory and match endpoints can sort/display cheaply.

-- ─── Relationship guard ─────────────────────────────────
-- SECURITY DEFINER so it can read coach_leads / user_profiles regardless of the
-- caller's RLS, without leaking row data (returns only a boolean).
CREATE OR REPLACE FUNCTION public.has_coaching_relationship(p_coach UUID, p_client UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_leads
    WHERE coach_id = p_coach AND user_id = p_client AND status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_client
      AND (personal_trainer_id = p_coach OR nutritionist_id = p_coach)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── Reviews table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_reviews_unique_client UNIQUE (coach_id, client_id),
  CONSTRAINT coach_reviews_no_self CHECK (coach_id <> client_id),
  CONSTRAINT coach_reviews_title_len CHECK (title IS NULL OR char_length(title) <= 120),
  CONSTRAINT coach_reviews_body_len CHECK (body IS NULL OR char_length(body) <= 2000)
);

DROP TRIGGER IF EXISTS coach_reviews_updated_at ON coach_reviews;
CREATE TRIGGER coach_reviews_updated_at
  BEFORE UPDATE ON coach_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coach_reviews_coach
  ON coach_reviews(coach_id, status, created_at DESC);

ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews; clients see their own; coaches see all of theirs.
DROP POLICY IF EXISTS coach_reviews_select ON coach_reviews;
CREATE POLICY coach_reviews_select
  ON coach_reviews FOR SELECT
  USING (status = 'published' OR client_id = auth.uid() OR coach_id = auth.uid());

-- A client may only post a review for a coach they actually worked with.
DROP POLICY IF EXISTS coach_reviews_insert_own ON coach_reviews;
CREATE POLICY coach_reviews_insert_own
  ON coach_reviews FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND public.has_coaching_relationship(coach_id, auth.uid())
  );

-- The client owns their review and can edit it. Coaches cannot alter reviews.
DROP POLICY IF EXISTS coach_reviews_update_own ON coach_reviews;
CREATE POLICY coach_reviews_update_own
  ON coach_reviews FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS coach_reviews_delete_own ON coach_reviews;
CREATE POLICY coach_reviews_delete_own
  ON coach_reviews FOR DELETE
  USING (client_id = auth.uid());

-- ─── Denormalised aggregates on the public profile ──────
ALTER TABLE coach_public_profiles
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2, 1),
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_coach_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_coach UUID := COALESCE(NEW.coach_id, OLD.coach_id);
BEGIN
  UPDATE coach_public_profiles p
  SET rating_avg = sub.avg_rating,
      rating_count = sub.cnt
  FROM (
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating,
           COUNT(*) AS cnt
    FROM coach_reviews
    WHERE coach_id = v_coach AND status = 'published'
  ) sub
  WHERE p.coach_id = v_coach;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS coach_reviews_refresh_rating ON coach_reviews;
CREATE TRIGGER coach_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON coach_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_coach_rating();
