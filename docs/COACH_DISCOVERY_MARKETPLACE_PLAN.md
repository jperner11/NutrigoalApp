# Meal & Motion Coach Discovery Marketplace Plan

## Product Thesis

Meal & Motion should expand as a coach discovery marketplace layered on top of the existing product, not as a social network.

The product promise becomes:

- Use AI to generate your own nutrition and training structure.
- Work with a Personal Trainer who already coaches you privately inside Meal & Motion.
- Discover a coach who matches your goal and convert into a managed coaching relationship.

This creates three clear product lanes:

- Solo mode: self-serve AI plans and tracking.
- Coach workspace: PTs manage existing private clients.
- Discover Coaches: users browse, compare, and request coaching from PTs.

## Strategic Principles

- Do not build an Instagram-style feed.
- Do not lead with likes, follows, comments, or creator mechanics.
- Keep public discovery separate from the private coaching relationship.
- Reuse the existing trainer-client workflow after a lead is accepted.
- Treat trust, clarity, and conversion as the primary goals.

## Core User Types

### Solo user

- Wants AI-generated diet and workout plans.
- May later upgrade into coached support.

### Coach

- Already manages private clients in Meal & Motion.
- Can optionally opt into public discovery.

### Managed client

- Has an accepted coach relationship.
- Uses Meal & Motion for assigned plans, messaging, feedback, and progress.

## Product Structure

Recommended app structure:

- Home
- Diet
- Training
- AI
- Discover Coaches
- My Coach
- More / Settings

Role of each area:

- Discover Coaches: public marketplace and matching surface.
- My Coach: private relationship after a coach accepts a lead or invites a client.
- Existing nutrition, training, AI, and client-management workflows stay intact.

## Pricing Strategy For V1

Meal & Motion should price this as two connected tracks:

- Individuals: Free, Pro, and Unlimited.
- Coaches: one paid coach workspace in v1.

Key pricing rules:

- Discover Coaches should be available on every individual plan, including Free.
- Individual upgrades should monetize self-serve AI depth, plan access, and regeneration flexibility.
- The paid coach plan should monetize the operating system: client delivery, intake, marketplace visibility, and lead management.
- Marketplace discovery should be included in the paid coach plan during beta, not sold as a separate pay-per-lead product.
- Seat-based coach pricing can come later after conversion, activation, and demand are validated.

## MVP Goal

Help a user find a relevant coach and allow that coach to convert them into a managed client inside the existing Meal & Motion workflow.

## MVP Scope

### Included

- Coach opt-in for public listing.
- Discover Coaches tab.
- Coach cards with structured profile data.
- Public coach profile page.
- Search and filtering.
- Request Coaching flow.
- Coach lead inbox.
- Accept / decline workflow.
- Conversion from accepted lead into existing managed-client relationship.

### Excluded

- Public posting feed.
- Social graph.
- Likes, comments, and follows.
- Open unlimited direct messaging.
- Public user profiles.
- Community features.

## Marketplace UX

### Coach card

Each card should show:

- Profile photo.
- Full name.
- Headline.
- Specialties.
- Goal focus.
- Coaching format.
- Starting price or price range.
- Accepting new clients flag.
- One concise trust cue such as years of experience or ideal client.

### Coach profile

Each profile should answer:

- Who do they help?
- What outcomes do they focus on?
- How do they coach?
- What does it cost?
- How do I contact them?

Recommended profile sections:

- Hero section with name, photo, headline, and CTA.
- Bio.
- Specialties.
- Ideal client.
- Coaching style.
- Services included.
- Check-in frequency.
- Online / in-person / hybrid.
- Price range.
- Availability.
- Testimonials and trust blocks in later phases.

### Contact flow

Do not start with open direct messages.

Recommended v1 flow:

1. User taps `Request Coaching`.
2. User fills in a short structured request.
3. Coach reviews the lead.
4. Coach accepts, declines, or asks for one follow-up clarification.
5. Accepted user becomes a managed client inside the current system.

## Matching Strategy

Start with transparent scoring, not black-box AI.

Initial ranking factors:

- Goal fit.
- Budget fit.
- Format fit.
- Experience-level fit.
- Coaching style fit.
- Accepting-new-clients status.

Later enhancements:

- Short matching quiz.
- Better ranking based on conversion and retention.
- Featured coaches.
- Location-aware discovery.

## Recommended Data Model

### coach_public_profiles

Purpose:
Stores public marketplace-facing coach information.

Suggested fields:

- coach_id
- is_public
- slug
- headline
- bio
- location_label
- remote_only
- price_from
- price_to
- currency
- years_experience
- certifications
- languages
- photos
- accepting_new_clients
- created_at
- updated_at

### coach_goal_tags

Purpose:
Supports filtering and matching.

Suggested fields:

- coach_id
- goal_tag

Example goal tags:

- fat_loss
- muscle_gain
- strength
- beginner_support
- accountability
- lifestyle_change

### coach_leads

Purpose:
Tracks marketplace inquiries before they become active clients.

Suggested fields:

- id
- coach_id
- user_id
- status
- goal
- message
- budget_range
- preferred_format
- experience_level
- created_at
- updated_at

Suggested statuses:

- pending
- accepted
- declined
- archived

### Later tables

- coach_testimonials
- coach_profile_views
- coach_profile_highlights

## Reuse From Existing Product

Existing trainer onboarding already captures useful marketplace data:

- coach_specialties
- coach_ideal_client
- coach_services
- coach_formats
- coach_check_in_frequency
- coach_style

This should be reused as the base for public profiles instead of creating a totally separate coach setup.

## Coach Onboarding Evolution

Split coach setup into two layers:

### Internal coaching setup

- Used for client management and delivery.
- Controls intake, workflow, and service configuration.

### Marketplace profile setup

- Used for discovery and conversion.
- Controls public listing, pricing, bio, photos, and visibility.

Not every coach should be public by default.

## Website Positioning

Public messaging should describe Meal & Motion as:

"A nutrition and training platform where users can either follow AI-powered plans on their own or find a coach who matches their goal."

Important messaging constraints:

- Present discovery as a marketplace, not social media.
- Keep self-serve and coached journeys equally clear.
- Keep public discovery separate from the private `My Coach` experience.
- Be honest about rollout stage when the feature is not yet live.

## Team Workstreams

### Product

- Finalize v1 user journeys.
- Define acceptance criteria for browsing, inquiry, and conversion.
- Keep the first release narrow and trust-first.

### Design

- Design Discover Coaches tab.
- Design coach cards and coach profile page.
- Design request flow and coach lead inbox.
- Create strong empty states for low-supply launch conditions.

### Engineering

- Add marketplace data model.
- Build listing, profiles, filters, and request flow.
- Reuse existing managed-client architecture post-acceptance.
- Add analytics hooks from day one.

### Growth and operations

- Curate the first public coaches before launch.
- Require minimum profile quality to go live.
- Define response expectations for coaches.

## Success Metrics

Primary metrics:

- Coach opt-in rate.
- Public profile completion rate.
- Discover tab to profile-view rate.
- Profile-view to request rate.
- Request to response rate.
- Request to acceptance rate.
- Accepted lead to active-client rate.

Secondary metrics:

- 30-day retention for matched users.
- Conversion from solo user to coached client.
- Coach satisfaction with lead quality.

## Main Risks

- Weak supply makes the marketplace feel empty.
- Low-quality profiles reduce trust.
- Open messaging creates spam.
- Blurred separation between discovery and active coaching confuses users.
- Social features distract from the core value.

## Rollout Plan

### Phase 1: Foundation

- Update public messaging.
- Define public coach profile schema.
- Build coach marketplace setup.
- Build listing and profile pages.

### Phase 2: Conversion

- Launch Request Coaching flow.
- Launch coach lead inbox.
- Add accept / decline handling.
- Convert accepted leads into existing managed-client workflow.

### Phase 3: Discovery quality

- Add filters.
- Add matching quiz.
- Improve ranking.
- Add marketplace analytics.

### Phase 4: Trust and expansion

- Add testimonials.
- Add response indicators.
- Add featured coaches.
- Add optional intro consultation booking.

## Immediate Execution Priorities

1. Align website positioning around the three product lanes.
2. Define marketplace schema and API boundaries.
3. Design Discover Coaches and coach profile flows.
4. Ship web MVP before mobile parity.
5. Launch with a curated initial supply of strong coaches.
