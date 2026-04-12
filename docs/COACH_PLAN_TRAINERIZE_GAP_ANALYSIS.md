## Coach Plan Deep Dive

Date: 2026-04-12

### New coach offer

- Plan name: `Coach Pro`
- Price: `$24.99/month`
- Client cap: `15 active clients`
- Positioning: a grow-with-us launch offer that is still useful for coaches with a real roster
- Packaging intent: merge the spirit of lower-end `Basic`, `Grow`, and `Pro` coach value into one simple launch plan

### SLC tester version

- Included now:
  - plan delivery
  - coach-client messaging
  - progress tracking
  - AI planning
  - intake, leads, marketplace visibility

- Coming next:
  - templates
  - automated delivery
  - coach video uploads
  - compliance dashboards

- Future add-ons:
  - payments
  - automations
  - health integrations

### How to think about the business model

- The platform subscription should sell the coach workspace, not the coach's service itself.
- Coaches should set their own public package pricing through marketplace offers.
- Meal & Motion monetizes software: onboarding, planning, delivery, messaging, progress, CRM, and visibility.
- The coach monetizes coaching.

### What is already in the product

- Mobile app foundation exists in `apps/mobile`
- Workout programs and workout logging exist
- Nutrition plans, meal tracking, water, cardio, and supplements exist
- 1:1 coach-client messaging exists
- Progress tools exist: weight, measurements, and photos
- Coach dashboard, client list, invites, leads inbox, marketplace profile, and public offers exist
- AI training and meal generation already exist

### Feature map against the Trainerize-style plan

#### Already present or very close

- Mobile app for iOS and Android
- Workout programs and workout tracking
- Basic in-app nutrition tracking
- In-app client messaging
- Digital member profiles
- Progress tools
- Body measurements
- AI workout builder
- Public coach profile and offer storefront

#### Can be built in-house on the current stack

- Automated program delivery
  - Build with scheduled plan assignment, rollout dates, and in-app reminders
  - Main cost is engineering time, not a required vendor

- Master workouts and program templates
  - Build by introducing reusable exercise/program template tables
  - Main cost is engineering time

- Video coaching
  - MVP can use Supabase Storage plus upload/playback UI
  - Better production streaming likely needs a video vendor later

- Education resources
  - Build with a coach resources library linked to clients or plans
  - Main cost is engineering time and content creation

- Compliance metrics
  - We already have raw logs for meals, workouts, progress, and messages
  - Build dashboards and compliance scoring on top of the data we already store

- Groups / community
  - Requires new data model, memberships, and moderation controls
  - No required vendor for MVP, but this is a non-trivial product area

#### Requires paid vendors, accounts, or partner access

- Apple App Store distribution
  - Requires Apple Developer Program membership

- Google Play distribution
  - Requires a standard developer registration path for Play distribution and verification

- Apple Health / Apple Watch sync
  - No major API usage fee expected, but requires Apple platform work and App Store distribution setup

- Android health sync
  - Health Connect is available on Android, but still requires mobile integration work

- Fitbit sync
  - Requires Fitbit OAuth/API integration and partner review/compliance work

- Garmin sync
  - Garmin business/developer access depends on approved program terms and is not a simple plug-and-play public integration

- Withings sync
  - Withings partner plans and contract-based access may apply depending on integration scope

- MyFitnessPal sync
  - Public pricing is not transparent; likely requires partner/business discussions or limited integration paths

- Zapier integrations
  - Can be built with webhooks plus Zapier app/webhook setup
  - Ongoing Zapier subscription cost applies if we want a polished non-engineer-friendly automation surface

- Stripe integrated payments for coach-to-client billing
  - Requires Stripe Connect design, payout handling, onboarding, disputes, compliance, and pricing decisions

### Recommended rollout order

#### Phase 1: highest value, lowest dependency

- Keep Coach Pro at `$24.99` and `15 clients`
- Add master workout / master plan templates
- Add automated program delivery
- Add coach video upload for client plans using existing storage
- Add a basic coach resource library
- Improve compliance reporting on top of current logs

#### Phase 2: revenue and retention

- Add Stripe Connect for coach payments
- Add a clearer coach offer checkout/request funnel
- Add client lifecycle automations via Zapier/webhooks

#### Phase 3: ecosystem integrations

- Add Apple Health / Health Connect first
- Evaluate Fitbit next
- Treat Garmin, Withings, and MyFitnessPal as partner-led workstreams, not quick features

### Cost notes

- The cheapest path is to ship the workflow features first because most of them are product work, not vendor work.
- The most expensive category is external integrations and payments infrastructure, not templates, dashboards, or delivery flows.
- Video coaching can start cheaply on our existing storage stack, but polished streaming at scale will likely need a dedicated video platform later.

### External cost / dependency checklist

- Apple App Store distribution
  - Requires Apple developer membership for production iOS distribution

- Google Play distribution
  - Requires the standard Play developer registration and verification path for production store distribution

- Zapier
  - Paid subscription required for a serious integration surface
  - Best treated as an ops/integration add-on, not part of the base margin model

- Stripe Connect
  - Adds platform payment complexity and recurring vendor fees
  - Should only be introduced when coach payment capture is a top-priority revenue lever

- Apple Health / Health Connect
  - Mostly engineering and compliance effort rather than major API licensing cost

- Fitbit / Garmin / Withings / MyFitnessPal
  - Treat as business-development style integrations first
  - Public self-serve pricing is not consistently transparent, and access/approval may be gated

### Live billing note

- Public pricing in code can be updated immediately.
- Actual Stripe checkout amount only changes when the Stripe price configuration used by `STRIPE_PRICE_PERSONAL_TRAINER` is updated in the deployment environment.
