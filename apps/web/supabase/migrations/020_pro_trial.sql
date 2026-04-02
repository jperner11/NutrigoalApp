-- Migration 020: Add trial_ends_at to user_profiles for 7-day Pro trial
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
