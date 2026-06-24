# Treno E2E — agentic "fake consumer" testing

This lets an AI agent (Claude, via the Playwright MCP browser) sign up and use the
app like a real PT or client, then report what's broken or confusing — so you don't
have to click through everything by hand.

There are two layers (this folder is the **agentic** one; deterministic Playwright
specs can be added later on the same foundation):

- **Foundation** (`lib/`, `seed-cli.ts`) — a safe test environment + pre-confirmed
  user seeding via the Supabase admin API.
- **Agentic runner** (`missions/`, `../../.mcp.json`) — natural-language missions an
  agent executes in a real browser.

---

## ⚠️ Use a TEST environment, not production

You currently have one hosted Supabase project (your prod DB). Seeding fake users
into it would pollute real data, so **set up a separate test environment first.**
The seed layer refuses to run if `E2E_SUPABASE_URL` equals the prod URL in
`.env.local` (override only with `E2E_ALLOW_PROD=1`, which you shouldn't).

Pick one:

### Option A — Local Supabase (best isolation, free, needs Docker)
```
npm i -g supabase
cd apps/web && supabase init && supabase start
supabase db reset      # applies everything in supabase/migrations/
```
Use the local API URL + service-role key it prints. In the local project's auth
settings, **email confirmation is off by default** — perfect for signup testing.

### Option B — A second hosted Supabase project (simplest, no Docker)
Create a new free project at supabase.com, run the SQL migrations from
`apps/web/supabase/migrations/` against it, then in **Auth → Providers → Email**
turn **"Confirm email" OFF** so the agent can complete real signups without an inbox.

---

## Setup

```
# from repo root
npm install                                   # picks up tsx + dotenv devDeps
cp apps/web/e2e/.env.e2e.example apps/web/.env.e2e
# edit apps/web/.env.e2e with your TEST project's credentials + E2E_BASE_URL
```

Run the app against the test DB (or point `E2E_BASE_URL` at a preview deploy):
```
npm run dev:web
```

## Seeding test users (skips the email-confirmation wall)

```
npm run e2e:seed -w apps/web -- create pt       # pre-confirmed personal trainer
npm run e2e:seed -w apps/web -- create client   # pre-confirmed free user
npm run e2e:seed -w apps/web -- cleanup         # delete ALL synthetic test users
```
`create` prints an email + password you can log in with directly.

## Running an agentic mission

The `.mcp.json` at the repo root registers the Playwright MCP server, which gives
the agent real browser tools (navigate, click, type, screenshot). In a Claude Code
session (you may need to restart it once so the new MCP server loads, and approve
it), just say:

> Run the PT onboarding mission in `apps/web/e2e/missions/pt-onboarding.md`
> against E2E_BASE_URL. Drive the browser yourself and report findings.

The agent executes the steps in a real browser and writes up what broke / felt off.

Missions available:
- `missions/pt-onboarding.md` — coach signup → onboarding → marketplace → verification
- `missions/client-onboarding.md` — client signup → onboarding → plan → tier gating
- `missions/invite-to-review.md` — full coach↔client loop incl. the review flow

## Deterministic CI safety net (Layer 1 — now built)

The same `lib/seed.ts` helpers back scripted `@playwright/test` specs that run on
every PR via `.github/workflows/e2e.yml`.

- Config: `apps/web/playwright.config.ts` (starts the app against the TEST project).
- Fixtures: `e2e/fixtures.ts` (seed a pre-confirmed user → log in via the real form).
- Specs: `e2e/specs/` — `smoke.spec.ts` (active) plus one `test.fixme` spec per
  mission, hardened against the live env after running the agentic mission once.
- Commands: `npm run e2e:install -w apps/web`, then `npm run e2e:test -w apps/web`.

**First-time setup is in [`SETUP_HOSTED.md`](./SETUP_HOSTED.md)** — create the test
project, apply `migrations-bundle.sql`, add three keys, and the suite runs locally
and in CI.
