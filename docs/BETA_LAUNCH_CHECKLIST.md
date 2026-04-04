# Mealandmotion Beta Launch Checklist

## Before inviting testers
- Apply the latest Supabase migrations, including:
  - `021_personal_trainer_invites.sql`
  - `022_beta_events.sql`
  - `023_support_requests.sql`
- Confirm web and mobile env vars are set correctly.
- Verify invite links open the correct deployed web domain.
- Confirm `support@mealandmotion.app` is monitored.
- Run the fresh-account QA flow from `docs/QA_CHECKLIST.md`.

## PT launch checks
- Personal Trainer signup lands in the PT experience.
- PT can send an invite and see it under pending invites.
- PT can resend, copy, and cancel an invite.
- PT dashboard shows active clients, pending invites, and needs-attention states.
- PT can assign diet and training plans to an active client.
- PT can open client messages and feedback requests.

## Client launch checks
- New client can accept an invite from email.
- Existing client can accept a join request without auto-linking before consent.
- Managed client sees trainer-connected state after acceptance.
- Managed client sees a clear waiting state if no plans have been assigned yet.
- Managed client can view assigned diet and training plans on mobile.
- Managed client can message their trainer and complete feedback requests.

## Support and ops checks
- Support page, FAQ, Privacy Policy, Terms, and Health Disclaimer all load publicly.
- Web and mobile settings both allow in-app support request submission.
- Submitted support requests appear in the user's recent support history.
- Beta docs are ready:
  - `docs/BETA_READINESS.md`
  - `docs/PT_TESTER_GUIDE.md`
  - `docs/CLIENT_TESTER_GUIDE.md`
  - `docs/QA_CHECKLIST.md`

## Metrics checks
- `beta_events` table is receiving invite and activation events.
- Reports page shows trainer beta metrics.
- First tester cohort can be monitored through:
  - invite sent
  - invite accepted
  - first plan assigned
  - first meal logged
  - first workout logged
  - first message sent

## Known beta limits to communicate
- Personal Trainers are web-first in beta.
- Clients are mobile-first, with web as backup.
- One active trainer per client.
- Payments, scheduling, and multi-trainer clinics are out of scope for the first beta.
- AI supports the experience, but the core workflow does not depend on it.
