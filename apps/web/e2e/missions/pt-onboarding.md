# Mission: Personal Trainer — signup → onboarding → marketplace profile

You are a **first-time personal trainer** evaluating Treno to run your coaching
business. Behave like a real, slightly impatient human. Use the Playwright MCP
browser tools to actually click through the app at `E2E_BASE_URL`.

## Goal
Sign up as a coach, complete onboarding, and get a public marketplace profile live
— then request verification.

## Steps
1. Go to the home page, find the "for coaches" / "become a coach" path, and start signup as a **personal trainer** (the signup URL accepts `?role=coach`).
2. Create an account. (The test Supabase project has email confirmation disabled, so signup should land you straight in. If you hit an email-confirmation wall, stop and report it — that means the test project still requires confirmation.)
3. Complete the coach onboarding questionnaire end to end. Fill every required field with realistic answers (specialties, ideal client, check-in frequency, style, formats).
4. Go to Settings → Marketplace. Fill in a headline, bio, price range, and make the profile **public**.
5. Submit a **verification request** (add any link as the certification).
6. Open `/find-coach` and confirm your new profile appears in the directory.

## What to report
- Any step that errored, hung, 404'd, or looked broken.
- Anything **confusing**: unclear copy, missing back buttons, fields with no explanation, dead ends, places you didn't know what to do next.
- Whether the marketplace profile correctly shows **no** "VERIFIED" badge (verification is pending, not granted).
- Total number of steps/clicks it took — friction is a conversion killer.
- A short verdict: would a real PT make it through without giving up?
