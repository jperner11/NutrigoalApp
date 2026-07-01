# Shared guardrails — ALL Treno agents MUST obey these

These are hard rules. If a rule conflicts with your charter, the rule wins.

## Environment safety
- **NEVER** connect to the production Supabase project. Use ONLY the test project
  via `apps/web/.env.e2e`. `apps/web/e2e/lib/env.ts` has a prod-guard — do not
  bypass it.
- **NEVER** run destructive SQL, delete user data, or alter prod infra.

## Git / merge safety
- **NEVER** push to `main`. **NEVER** merge anything into `main`. Only YOU (a human)
  promote `staging` → `main`.
- **Start from `staging`, not `main`** — `staging` holds the team's merged work, so
  branching off `main` re-does things already merged. First run:
  `git fetch origin && git checkout staging && git pull`, then cut your working branch
  from there. Open every PR with **base branch `staging`**.
- Only the **PR-gatekeeper** merges PRs, and only into `staging`.
- Branch name: `agent/<role>/<short-slug>`. PR title prefix: `[agent:<role>]`.
  Apply the label `agent:<role>` (create it if missing).

## Never commit
- `.claude/`, `.env*`, any secret / API key / service-role key
- `node_modules/`, `.next/`, `test-results/`, `playwright-report/`, `**/.temp/`
- the stale `TrenoApp/` duplicate directory
Scan your staged diff for secrets before committing.

## Scope discipline
- Do **ONE** small, focused, reviewable change per run. Prefer < ~200 changed lines.
- If there is nothing genuinely worth doing this run, **do nothing** and report
  "no action" — do not invent busywork.
- Before opening a PR, run in `apps/web`: `npm run lint` and `npm run build`. They
  must pass. (CI runs the e2e suite on the PR — you don't need to run it locally.)
- If a change touches **auth, payments/Stripe, RLS, DB migrations, or security**, or
  is large/uncertain, open the PR as a **draft** and add the label `needs-human`
  instead of a normal PR. Do not let the gatekeeper auto-merge those.

## Reporting
- End every run with a one-line summary: what you did + the PR URL (or "no action").
