-- Migration 056: Deduplicate coach_waitlist and enforce unique emails.

DELETE FROM coach_waitlist a
USING coach_waitlist b
WHERE a.email = b.email
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_waitlist_email
  ON coach_waitlist (email);
