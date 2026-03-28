-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT NOT NULL,
  pose TEXT NOT NULL DEFAULT 'front' CHECK (pose IN ('front', 'side', 'back')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists view client photos" ON progress_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_clients nc
      WHERE nc.nutritionist_id = auth.uid()
        AND nc.client_id = progress_photos.user_id
        AND nc.status = 'active'
    )
  );

-- Body measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  neck FLOAT,
  shoulders FLOAT,
  chest FLOAT,
  left_arm FLOAT,
  right_arm FLOAT,
  waist FLOAT,
  hips FLOAT,
  left_thigh FLOAT,
  right_thigh FLOAT,
  left_calf FLOAT,
  right_calf FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists view client measurements" ON body_measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_clients nc
      WHERE nc.nutritionist_id = auth.uid()
        AND nc.client_id = body_measurements.user_id
        AND nc.status = 'active'
    )
  );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
