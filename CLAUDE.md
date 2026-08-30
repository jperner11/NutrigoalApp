# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Turborepo monorepo for **Treno** (previously TrenoApp / Performance Clinic), using npm workspaces (`npm@11.9.0`).

- `apps/web/` — Next.js 15 web app (primary).
- `apps/mobile/` — Expo 55 + React Native app.
- `packages/shared/` — `@treno/shared`: types, role helpers, nutrition/training/cardio calculations, constants. Consumed by both apps; web's `next.config` has `transpilePackages: ['@treno/shared']`.

For web-app architecture (routes, project structure, tech stack), see `apps/web/README.md`. There is no `apps/web/CLAUDE.md` in this repo — don't rely on one existing.

## Commands (from monorepo root)

```bash
npm run dev:web      # Next.js dev server on localhost:3000
npm run build:web    # Production build of the web app
npm run lint:web     # ESLint on the web app
```

Turbo is installed but the root `package.json` scripts delegate directly via `npm run ... -w apps/web`. `turbo.json` defines `build`/`dev`/`lint` tasks if you want to run across all workspaces (e.g. `npx turbo run build`).

`apps/web` has Playwright e2e specs in `apps/web/e2e/` (run via `npm run e2e:test -w apps/web`). No other workspace has a test framework configured.

## Working with `packages/shared`

After editing files in `packages/shared/src/`, rebuild before the web or mobile app will pick up changes:

```bash
cd packages/shared && npm run build
```

The compiled output lives in `packages/shared/dist/` and is what the apps actually import.
