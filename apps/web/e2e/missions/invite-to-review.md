# Mission: Full coach↔client loop — invite → accept → plan → review

This mission needs **two browser sessions** (a coach and a client). The coaching
relationship is the core of the product, so this is the most important flow to
exercise. Drive the browser at `E2E_BASE_URL`.

## Setup
Seed a coach and a client up front (skips the email step):
```
npm run e2e:seed -w apps/web -- create pt       # note the email + password
npm run e2e:seed -w apps/web -- create client   # note the email + password
```
Both are pre-confirmed; log in with the printed credentials.

## Goal
A coach invites a client, the client accepts, the coach delivers a plan, and the
client leaves a review that shows up on the coach's public profile.

## Steps
1. **As the coach:** log in. If onboarding isn't done, complete it. Make the marketplace profile public.
2. **As the coach:** go to Clients → invite the seeded client (by email).
3. **As the client:** log in, find/accept the invite, and confirm you're now a managed client of that coach.
4. **As the coach:** open the client and deliver a meal or training plan to them.
5. **As the client:** confirm the plan appears under "my coach" / your plans.
6. **As the client:** go to the coach's public profile (`/find-coach/<slug>`) and leave a **review** (rating + text).
7. **As anyone:** reload the coach profile and confirm the rating + review now appear, and the directory card shows the star rating.

## What to report
- Any broken handoff between the two roles (invite not arriving, accept failing, plan not visible to client).
- Whether the review gate works: the client *can* review because they have a real relationship. (Bonus: a non-client should NOT be able to review.)
- Whether the rating aggregate (avg + count) updates correctly on the profile and directory.
- Friction or confusion at any step.
- A short verdict on the coach↔client experience.
