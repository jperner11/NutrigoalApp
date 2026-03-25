-- 006: Allow authenticated users to insert exercises
-- Needed for AI-generated training plans to create new exercises
CREATE POLICY "Authenticated users can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
