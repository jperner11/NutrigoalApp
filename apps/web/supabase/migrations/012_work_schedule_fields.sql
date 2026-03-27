-- Add work schedule fields for better meal timing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '17:00';
