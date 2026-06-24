# E2E setup — hosted test Supabase project

This is the **your-part** checklist. Everything else (Playwright harness, specs, CI)
is already built. Once you finish these steps, the deterministic suite runs locally
and on every PR, and the agentic missions can run against the same env.

> ⚠️ This must be a **separate throwaway project**, never your production database.
> The seed layer hard-refuses to run if the test URL equals the prod URL in `.env.local`.

---

## 1. Create the test project (~3 min)

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it something like `treno-e2e`. Pick the free tier. Save the DB password.
3. Wait for it to finish provisioning.

## 2. Turn OFF email confirmation (~1 min)

**Authentication → Providers → Email → uncheck "Confirm email" → Save.**
This lets seeded/signup users log in immediately without an inbox.

## 3. Apply the schema (~1 min)

1. Open the project's **SQL Editor → New query**.
2. Paste the entire contents of [`migrations-bundle.sql`](./migrations-bundle.sql)
   (all 43 migrations, in order) and **Run**.
3. If anything errors, tell me which statement — a couple of migrations may need a
   one-line tweak on a fresh project.

> Regenerate the bundle anytime after adding migrations:
> ```
> cd apps/web/supabase/migrations && \
>   for f in $(ls -1 *.sql | sort); do echo "-- $f"; cat "$f"; echo; done \
>   > ../../e2e/migrations-bundle.sql
> ```

## 4. Grab the keys

**Project Settings → API**, copy:
- **Project URL** → `E2E_SUPABASE_URL`
- **anon / public** key → `E2E_SUPABASE_ANON_KEY`
- **service_role** key → `E2E_SUPABASE_SERVICE_ROLE_KEY` (secret — never commit)

## 5. Wire up local config

```bash
cp apps/web/e2e/.env.e2e.example apps/web/.env.e2e
# edit apps/web/.env.e2e with the three keys above; leave E2E_BASE_URL=http://localhost:3000
```

## 6. Install Playwright + run

```bash
npm install                              # picks up @playwright/test
npm run e2e:install -w apps/web          # downloads the Chromium browser
npm run e2e:test -w apps/web             # starts the app on the test project + runs specs
npm run e2e:report -w apps/web           # open the HTML report
```

The smoke specs should go green immediately. The three flow specs are `test.fixme`
(skipped) until we harden their selectors against this live env — see step 8.

## 7. Enable CI (~2 min)

Repo **Settings → Secrets and variables → Actions → New repository secret**, add:
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`

`.github/workflows/e2e.yml` then runs the suite on every PR and push to `main`.
(Without the secrets it auto-skips, so it won't block anything before you're ready.)

## 8. Harden the flow specs (with me)

Once the env is live, we run the **agentic missions** (`e2e/missions/*.md`) so the
agent discovers the real onboarding fields/labels, then drop those locators into the
`test.fixme` specs and flip them on. After that you have:

- **Layer 1 (deterministic)** — green-gate on every PR.
- **Layer 2 (agentic)** — exploratory persona runs on demand / scheduled.
