# SLC v1 — Gym Test Q&A

## Purpose

This document is **upstream** of the existing beta/test docs. It exists to force decisions *before* we hand Meal & Motion to real Personal Trainers at a local gym — so that `PT_TESTER_GUIDE.md`, `QA_CHECKLIST.md`, and the pricing/onboarding copy are all shaped by the same answers.

It is organised around **Simple, Lovable, Complete**:

- **Simple** — the single thing a PT must be able to do without getting lost.
- **Lovable** — the small number of moments that make a PT *want* to keep using it.
- **Complete** — the places where if something is broken or missing, trust evaporates and the test is over.

How to use it:

1. Answer questions inline under `Your answer:`. Leave a question blank if you don't know yet — blanks are themselves signal.
2. Anything marked **DECISION** changes scope materially. Flag any you want to discuss before committing.
3. Where possible, talk to at least one real PT at the gym *while* answering — a lot of these questions are not answerable from a desk.

Related docs (do not duplicate — these are downstream of this one):
- `docs/BETA_READINESS.md` — beta scope and promise (PT=web, client=mobile, etc.)
- `docs/PRICING_SLC_LAUNCH.md` — Coach Pro $24.99, 15 clients, deferrals
- `docs/PT_TESTER_GUIDE.md` — what to click once testing
- `docs/QA_CHECKLIST.md` — fresh-account walkthrough

---

## 1. The test in one sentence

Before anything else: finish this sentence in one line. If you can't, the test isn't defined.

> **"By the end of the gym test, I will know whether Meal & Motion is good enough that \_\_\_\_ will \_\_\_\_."**

Example shapes (pick or write your own):
- "...a working PT will keep using it after the free period without me nagging them."
- "...a PT will recommend it to another PT at the gym."
- "...a PT's client will log meals for 7 days without dropping off."

Your answer: a PT will be able to maintain a relationship with its clients via the app. Checking on progression on workouts (ie what was their sets/reps last time they did workout A), check meal plan and adherence to plan, check weight log. The PT will trigger check-in or schedule those to happen automatically, the client will reply the check-in questions (custom from PT to PT). With all of that, without dropping off, the PT's will come back and stick to it.

> 

**Why it matters:** everything below narrows or widens based on this. If the answer is about *PT retention*, lovability matters most. If it's about *client adherence*, the client-side mobile flow matters most. They're not the same test.

---

## 2. The PTs

### 2.1 Who, concretely?

How many PTs are in the test, and what do you already know about them? Names are fine, but what matters is their shape:

- How long have they been PTs?
- Do they currently write meal plans, or do they stay strictly in training and send clients to a nutritionist?
- Do they run a client roster alone, or through the gym?
- Are any of them already paying for something like Trainerize, TrueCoach, MyFitnessPal Premium, a Google Sheets template, or just WhatsApp + notes?
- Do they speak English comfortably? (Reminder: the app is EN-only for the test.)

Your answer: I know them for a while - it's going to be 1 or 2 PTs, they currently write meal plans and workout plans. they have their own clientele. One of them is paying for Trainerise and the other uses a different app (dont know the name). They are english natives.

> 

**Why it matters:** if your test PTs don't currently write meal plans, the whole food-DB workstream is irrelevant for them and the test becomes a training-plan test. If they all already use Trainerize, your Simple bar is "at least as good as the parts of Trainerize they actually use" — which is a much smaller target than "Trainerize feature parity".

### 2.2 What do they do on Monday morning?

Describe, as concretely as you can, the actual weekly loop of one of your test PTs with one of their clients. From "client shows up" through "client sends a photo on Sunday."

Your answer: I don't know - I will take my own exmaple with my coach using a different app too. The check in trigger on Sunday (you have a pending feedback), then it's a few questions (10 more or less) asking about digesntion, adherence to meal plan, adherence to workout plan, positives and negatives this week, adherence to supplements, score 1-10 this last cycle, in the end it asks for photos (front, side, back, favourite pose, extra photo if want). The next day my coach checks my answers, review my workout progression, etc and decide to make changes. 

> 

**Why it matters:** Meal & Motion replaces *part* of an existing loop, not all of it. The parts it doesn't replace are the parts where the PT will keep using their current tool — and every tool-switch in a week is a moment where the PT decides whether to bother opening your app at all. Fewer switches = more usage.

### 2.3 What would make them *stop* using it after week one?

Not "what's a bug." What's the thing that, if it happened once, would make them quietly never open the app again?

Your answer: I think it they cannot do at least what they can in Trainerise (find clientele, run check ins, etc). I appreciate at the start will be hard to use the marketplace as we dont have users but that's it

> 

**Why it matters:** this is the definition of Complete for your specific PTs. It's almost never "a feature is missing" — it's usually "I looked dumb in front of a client" or "I lost 20 minutes of work".

---

## 3. Simple — the critical path

### 3.1 The one flow

Complete this: **"A PT using Meal & Motion for the first time must be able to \_\_\_\_ within 15 minutes of signing up, without asking me for help."**

Your answer: create account and don't feel lost - find whatever they need, like creating custom questions, setting up their workspace/dashboard, prices, profile that show on marketplace, etc. profile picture

> 

**DECISION — default:** *invite one real client, build them a meal plan and a training plan, and send one message.* If you write anything else here, it overrides the default and reshapes the onboarding.

### 3.2 What we cut from the sidebar for the test

The current authed app has ~42 pages. For the test, most should be hidden or demoted so PTs don't wander into half-done surfaces. Mark each as **Keep**, **Hide**, or **Demote** (i.e. still accessible but not in the main nav).

- [ ] Dashboard
- [ ] Clients (list + detail + invite)
- [ ] Client diet / training / messages / feedback sub-pages
- [ ] Diet (list / detail / new) — PT's own
- [ ] Training (list / detail / new / session) — PT's own
- [ ] Cardio
- [ ] Supplements
- [ ] Water
- [ ] Grocery
- [ ] Progress (overview / photos / measurements)
- [ ] Onboarding
- [ ] Settings
- [ ] Reports
- [ ] Generate-plans
- [ ] AI coaching hub (`/ai/coaching` + tool sub-pages)
- [ ] AI suggest
- [ ] Discover (coach marketplace)
- [ ] Leads (coach CRM)
- [ ] My-nutritionist (managed client view — not for PTs)

**Why it matters:** the default sidebar tells the PT what the app is *for*. Every surface they see that isn't relevant to their job dilutes the message. Hiding is reversible; a confused PT is not.

### 3.3 What we tell the PT *not* to try

Are there features that technically work but aren't ready for a paying customer to kick the tyres on? List them here so the tester guide can explicitly say "don't test X yet".

Your answer:

> 

---

## 4. Lovable — the moments that matter

A lovable product has 2–4 moments the user talks about. Not a list of features — moments. Examples from other products: "I typed a URL and a whole article appeared," "I pasted a screenshot and it just worked."

### 4.1 Candidate moments

Here are the moments Meal & Motion could realistically deliver today. Rank them 1 (most lovable) to N (least), and cross out any that aren't actually delivered yet:

- Typing "200g chicken breast, 100g rice, 1 tbsp olive oil" and seeing macros appear instantly.
- Sending a client an invite by email and watching them show up as "active" 30 seconds later.
- Opening a client and seeing their last 7 days of weight, photos, and meal adherence in one view.
- Messaging a client from the PT web app and getting a reply on mobile in real time.
- Duplicating a plan from one client to another in one click.
- A client ticking off a meal on mobile and the PT seeing the tick on the web dashboard without refresh.
- (Add your own.)

Your answer:

> 

**Why it matters:** the #1 ranked item becomes the demo you show a PT in the first 60 seconds of onboarding. If it's not bulletproof, cut it. Lovable moments that misfire are worse than absent.

### 4.2 The "wow, I didn't expect that" moment

Is there one small thing — maybe something that's already built but not promoted — that you think would genuinely surprise a PT in a good way?

Your answer:

> 

---

## 5. Complete — where trust breaks

### 5.1 The non-negotiables

For each of these, mark whether it **must** work flawlessly in v1, or whether there's a known limitation the PT can live with if we warn them.

- [ ] A client invite reliably arrives in the client's inbox and is not in spam.
- [ ] A client can accept the invite from their phone in under 2 minutes without creating two accounts.
- [ ] A meal plan built by the PT on web shows up on the client's mobile app within a minute, correctly.
- [ ] A training plan built on web shows up on mobile, correctly.
- [ ] A client's logged meal appears back on the PT's dashboard within a minute.
- [ ] A message sent in either direction is delivered, and the unread count is correct.
- [ ] A client can never accidentally see another client's data.
- [ ] A PT can never accidentally edit another PT's client.
- [ ] Nothing important is permanently deleted by a single misclick.

Your answer:

> 

### 5.2 The "I looked dumb in front of my client" list

Separate from bugs — what are the moments where the app could make a PT feel embarrassed in front of their own client? These are disproportionately important because the PT's reputation is on the line, not just their time.

Your answer:

> 

### 5.3 What's missing that a PT *will* notice

Be honest. List the things that a working PT *will* look for in week one that currently don't exist. We don't need to build them — we need to know whether to warn, work around, or ship.

Candidates to consider: video uploads for exercises, PDF export of a plan, a signature/branding element, a client progress report, bulk-duplicating a plan, body-fat percentage tracking, schedule/calendar view, check-in reminders.

Your answer:

> 

---

## 6. Food logging — the spine of manual meal plans

This section exists because it's the decision that most shapes the next two weeks of build work. Answer these before the food-DB code work starts.

### 6.1 The input model

When a PT adds a food to a meal in a plan, what do they *want* to type? Pick one as the primary, others as secondary:

- [ primary ] Search a food database by name and pick from a dropdown (`chicken breast` → result list).
- [ secondary ] Free-text a whole meal at once (`200g chicken, 100g rice, olive oil`) and have it parsed.
- [ ] Scan a barcode on their phone (mobile only).
- [ ] Pick from a personal "my foods" list they've built up over time.
- [ ] Paste an existing client's meal and adapt it.

Your answer:

> 

**DECISION — default:** free-text primary, search fallback, personal list second. Full food-DB fix (Open Food Facts + Spoonacular + custom foods + OpenAI free-text parse) is already scoped for this.

### 6.2 Accuracy vs. speed

If a PT types `200g chicken breast` and the food DB returns 4 possible matches with slightly different macros (skinless, with skin, raw, cooked), what should happen?

- [ ] Silently pick the closest match, let the PT override afterwards.
- [ ] Pause and ask the PT to pick.
- [ ] Pick the closest match and flag it visually so the PT knows to review.

Your answer: option 2 - ask PT to pick.

> 

**Why it matters:** silent picking is fast but wrong sometimes and the PT won't know. Pausing is correct but breaks flow. Flagged-pick is the middle — and it's the only one that's both fast *and* honest.

### 6.3 Who owns the macros?

When the macros the app computes disagree with what a PT knows to be true (say, for a local brand), what wins?

- [ ] The PT can override the macros per-food, and the override is saved to their "my foods" list for next time.
- [ ] The PT can override just for this meal, not globally.
- [ ] No override — the PT has to create a custom food instead.

Your answer: the macros should be set by the PT. we don't need to the PT the target macros. we just need to show the macros of a diet the client is currently having (ie I eat only lunch and that's 900kcal, 30g protein, 70gr carbs, 8gr of fat) - that should be picked up by AI.

> 

### 6.4 What database goes first

For the gym test, the PTs and their clients will mostly log:

Your answer (list 5–10 foods you expect to see a lot): rice, chicken, potato, pasta, whey protein, oatmeal, oats, eggs, banana, peanut butter, fruits (wide variety).

> 

**Why it matters:** I'll pre-seed a test account with those exact items so the first-ever food search a PT runs *works*. The worst possible first impression of a food DB is "no results".

---

## 7. The client experience

The client side is mobile-first and mostly out of scope for the PT to build, but the PT's test fails if the client experience is bad.

### 7.1 The client onboarding in one paragraph

What do you want a client to see between "PT hit invite" and "client is looking at their meal plan"? Describe it as a story, not a checklist.

Your answer:

> 

### 7.2 What the client *must not* see

Managed clients shouldn't see AI generation, pricing upsells, marketplace prompts, or anything that implies they're on a self-serve plan. Is there anywhere you suspect they currently do?

Your answer:

> 

### 7.3 Client feedback path

How should a client report "this doesn't work" during the test — through their PT, directly to you, or both? The answer changes what goes in the client's settings screen.

Your answer:

> 

---

## 8. Success criteria

### 8.1 What counts as a successful test

Fill in these thresholds. They should be painful to commit to.

- Number of PTs who finish the full critical-path flow without asking for help: **\_\_ / \_\_**
- Number of PTs who are still using the app unprompted 7 days after first use: **\_\_ / \_\_**
- Number of real clients invited across all PTs: **at least \_\_**
- Number of clients who accept and log at least one meal: **at least \_\_**
- Number of PTs who say yes to paying $24.99/month after the test: **at least \_\_**
- Number of show-stopper bugs we're willing to ship with: **\_\_**

Your answer:

> 

### 8.2 What counts as a failed test

A test can succeed in metrics and still fail in substance. What answer from a PT would make you stop and rethink, even if the numbers looked fine?

Your answer:

> 

---

## 9. Logistics

### 9.1 Timing

- Target start date of the test:
- Duration:
- Checkpoints (e.g. mid-test review after 1 week):

Your answer:

> 

### 9.2 Onboarding the PTs

- How do the PTs first hear about the test? (You walk up at the gym / email / gym owner introduces / etc.)
- Do you onboard them 1:1 in person, over a call, or self-serve with the tester guide?
- Are they paying, on a free trial, or comped entirely for the test?

Your answer:

> 

**Why it matters:** a PT onboarded 1:1 in person will excuse rough edges that a self-serve PT will not. If the test is self-serve, the onboarding copy and empty states have to be much sharper.

### 9.3 Feedback collection

- How do PTs report issues and thoughts? (WhatsApp group / email / a form / a weekly call / all of the above)
- Who triages? Is it you, or is there someone else?
- What's the SLA you're promising PTs for bug fixes during the test?

Your answer:

> 

### 9.4 Kill criteria

At what point do you stop the test and rework, versus push through? Be specific — "it's going badly" isn't a trigger, "3 PTs have stopped opening the app for more than 3 days" is.

Your answer:

> 

---

## 10. Parking lot

Anything that came up while answering that doesn't fit above — ideas, fears, tangents, things you want to remember.

> 

---

*When this doc is filled in, I'll use it to: (1) rewrite the public copy in the right voice for the real PTs, (2) cut the sidebar for the test build, (3) prioritise the food-DB work (or de-prioritise parts of it), and (4) produce a focused `PT_TESTER_GUIDE.md` rewrite that matches the decisions made here.*
