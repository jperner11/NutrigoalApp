import { defineConfig, devices } from '@playwright/test'
import { e2eEnv } from './e2e/lib/env'

// Deterministic E2E layer (Layer 1). Runs the natural-language missions in
// e2e/missions/* as scripted, repeatable specs against a TEST Supabase project.
// See apps/web/e2e/README.md and apps/web/e2e/SETUP_HOSTED.md.

const isLocal = /localhost|127\.0\.0\.1/.test(e2eEnv.baseUrl)

// Forward the HTTPS proxy to the browser so it can reach external services
// (e.g. Supabase) in cloud/CI environments where outbound HTTPS is gated.
const browserProxy = process.env.HTTPS_PROXY
  ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1,::1' }
  : undefined

// Core user-facing specs also run on mobile viewports — testers are mostly on
// phones. Deep multi-user/coach specs stay desktop-only to keep runtime sane.
const MOBILE_SPECS = /smoke|signup|reset-password|client-onboarding|log-meal|log-workout/

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
    proxy: browserProxy,
    // The cloud environment uses a MITM proxy for outbound HTTPS. Its CA is in the
    // system store but headless Chromium doesn't always load it; ignoring HTTPS errors
    // is appropriate here — this suite tests app behaviour, not TLS.
    ignoreHTTPSErrors: !!process.env.HTTPS_PROXY,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // In cloud/CI environments where the pre-installed Chromium revision doesn't
        // match the @playwright/test version, point at the system binary directly.
        // Set PLAYWRIGHT_EXEC_PATH (e.g. /opt/pw-browsers/chromium) to activate.
        ...(process.env.PLAYWRIGHT_EXEC_PATH
          ? {
              launchOptions: {
                executablePath: process.env.PLAYWRIGHT_EXEC_PATH,
                // Belt-and-suspenders: also pass --proxy-server at the browser level
                // so fetch() requests from page JS route through the proxy.
                args: browserProxy
                  ? [
                      `--proxy-server=${browserProxy.server}`,
                      `--proxy-bypass-list=${browserProxy.bypass}`,
                    ]
                  : [],
              },
            }
          : browserProxy
            ? {
                launchOptions: {
                  args: [
                    `--proxy-server=${browserProxy.server}`,
                    `--proxy-bypass-list=${browserProxy.bypass}`,
                  ],
                },
              }
            : {}),
      },
    },
    {
      // Android-class coverage. Chromium engine → safe everywhere, including the
      // cloud sandbox (shares the chromium binary/exec-path handling above).
      name: 'mobile-chrome',
      testMatch: MOBILE_SPECS,
      use: {
        ...devices['Pixel 7'],
        ...(process.env.PLAYWRIGHT_EXEC_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXEC_PATH } }
          : {}),
      },
    },
    // iPhone-class coverage (WebKit — the engine Safari users actually get).
    // Opt-in via E2E_WEBKIT=1: CI sets it; the cloud sandbox does NOT (webkit's
    // system deps aren't in its image, and a missing browser aborts the whole run).
    ...(process.env.E2E_WEBKIT === '1'
      ? [
          {
            name: 'mobile-safari',
            testMatch: MOBILE_SPECS,
            use: { ...devices['iPhone 14'] },
          },
        ]
      : []),
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
