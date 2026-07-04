import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/lib/env'

// Deterministic E2E layer (Layer 1). Runs the natural-language missions in
// e2e/missions/* as scripted, repeatable specs against a TEST Supabase project.
// See apps/web/e2e/README.md and apps/web/e2e/SETUP_HOSTED.md.

const isLocal = /localhost|127\.0\.0\.1/.test(e2eEnv.baseUrl)

export default defineConfig({
  testDir: './e2e/specs',
  // Each spec seeds its own users, so files are independent and can run in parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: e2eEnv.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the pre-installed system Chromium in cloud/CI environments where the
        // pinned Playwright revision may not be downloaded.
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],

  // When pointed at localhost, Playwright starts the app for us — crucially with the
  // TEST project's public credentials so the browser client never touches prod.
  // When E2E_BASE_URL is a deployed preview already wired to the test project, skip this.
  webServer: isLocal
    ? {
        // CI builds once and serves a production build — fast startup, no per-route
        // dev compile (which can take minutes cold). Locally we use the dev server
        // for fast iteration; loginAs() retries submits to absorb slow hydration.
        command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
        url: e2eEnv.baseUrl,
        timeout: process.env.CI ? 300_000 : 180_000,
        // By default we boot a fresh server with test env (CI, and locally) rather
        // than reuse whatever dev server you have running — that one is probably
        // pointed at prod. Set E2E_REUSE_SERVER=1 only when you've deliberately
        // started a dev server against the TEST project and want to reuse it.
        reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
        env: {
          NEXT_PUBLIC_SUPABASE_URL: e2eEnv.supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: e2eEnv.anonKey,
          SUPABASE_SERVICE_ROLE_KEY: e2eEnv.serviceRoleKey,
        },
      }
    : undefined,
})
