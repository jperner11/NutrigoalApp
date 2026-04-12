## Pricing SLC Launch Plan

Date: 2026-04-12

### Goal

Ship a pricing model that is simple to understand, lovable in the public story, and complete enough to work with the product and billing system that already exist.

### What the product supports today

- Individual roles: `free`, `pro`, `unlimited`
- Coach role: `personal_trainer`
- Managed client role: `personal_trainer_client`
- Stripe checkout supports fixed subscriptions for `pro`, `unlimited`, and `personal_trainer`
- A 7-day Pro trial backend already exists
- Coach marketplace pricing is separate from platform billing and is handled through public coach offers

### SLC launch decision

- Keep two clear tracks: Individuals choose between Free, Pro, and Unlimited, while coaches get one paid Coach Pro workspace in v1.
- Lead with the simplest believable promise: Free includes discovery and limited self-serve access, Pro is the main paid plan for most individuals, Unlimited is for heavier self-serve AI usage, and Coach Pro is the operating system for client delivery plus marketplace visibility.
- Do not promise billing complexity we have not implemented: no public claim about per-client overage billing yet, no public claim about seat-based coach plans yet, and no annual billing story yet.

### Coach launch offer

- Coach Pro is priced at `$24.99/month`
- Coach Pro includes up to `15 active clients` in v1
- This is a founder-style grow-with-us offer designed to be attractive for early coaches while still feeling credible for coaches with an existing roster
- Marketplace package pricing remains separate from the platform subscription

### Product messaging rules

- Discover Coaches stays available on every individual plan, including Free
- Individual upgrades sell deeper self-serve usage, not access to discovery
- Coach platform pricing stays separate from coach package pricing
- Coach package pricing belongs in coach offers, not in Stripe platform tiers

### Launch implementation

- Update shared pricing copy to match supported behavior
- Refresh the public pricing page around the SLC story
- Add a real Pro trial CTA instead of only talking about upgrades
- Update in-app upgrade prompts so free users can start the trial with less friction
- Keep coach signup and invite-cap logic in sync with the public coach offer
- Log the change in the running progress note

### Operational note

- Updating the displayed coach price in code does not automatically change the amount charged in Stripe checkout.
- To make live billing match the product copy, the hosted environment must point `STRIPE_PRICE_PERSONAL_TRAINER` at a Stripe recurring price configured for `$24.99/month`.

### Explicitly deferred

- Seat-based coach billing
- Per-client paid overages
- Marketplace pay-per-lead models
- Annual plans
- Full billing refactor away from role-based access
