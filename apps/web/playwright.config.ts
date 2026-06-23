import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  resolveTestDbUrl,
  TEST_API_PORT,
  TEST_API_URL,
  TEST_WEB_PORT,
  TEST_WEB_URL,
} from './e2e/support/env.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../..');

// Shared by both webServer processes: a throwaway, migrated SQLite db
// (provisioned in globalSetup), isolated from the developer's local dev.db,
// the production Turso database, and apps/api's own e2e test db.
const sharedTestEnv = {
  TURSO_DATABASE_URL: resolveTestDbUrl(),
  NODE_ENV: 'development',
  BETTER_AUTH_URL: TEST_API_URL,
  BETTER_AUTH_SECRET: 'e2e-test-only-secret-do-not-use-in-production',
  NEXT_PUBLIC_API_URL: TEST_API_URL,
  NEXT_PUBLIC_APP_URL: TEST_WEB_URL,
  PORT: String(TEST_API_PORT),
  // The real sendResetPassword path isn't exercised by this suite, but
  // better-auth's email/password plugin is configured regardless - keep
  // Brevo disabled/unset so a missing key can't cause a startup crash.
  BREVO_API_KEY: '',
  // See apps/api/src/plugins/ratelimit.ts: each browser-driven test journey
  // makes several real /api/auth/* calls (sign-up, get-session polls on
  // every navigation, sign-out, sign-in), which adds up across even a small
  // suite faster than the production default (20/60s) allows.
  AUTH_RATE_LIMIT_MAX: '500',
};

export default defineConfig({
  testDir: './e2e',
  // Serial, single-worker execution keeps the suite's total real-network
  // auth traffic predictable (relevant given the process-global in-memory
  // rate limiter raised via AUTH_RATE_LIMIT_MAX below) and avoids each test
  // needing its own isolated trip/expense fixtures.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'playwright-report/results.xml' }]]
    : 'html',
  globalSetup: './e2e/support/global-setup.ts',
  globalTeardown: './e2e/support/global-teardown.ts',
  use: {
    baseURL: TEST_WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // `generate` is chained directly into the start command (not left to
      // globalSetup alone) so the server process never starts before
      // @prisma/client is populated - globalSetup runs in a separate
      // process from this spawned one, and relying purely on cross-process
      // ordering proved to be a real race on a clean/cold CI install (see
      // PR discussion).
      command:
        'pnpm --filter @group-expense-hub/db generate && pnpm --filter api exec tsx watch src/index.ts',
      url: `${TEST_API_URL}/health`,
      cwd: repoRoot,
      env: sharedTestEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `pnpm --filter web exec next dev --port ${TEST_WEB_PORT}`,
      url: TEST_WEB_URL,
      cwd: repoRoot,
      env: sharedTestEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
