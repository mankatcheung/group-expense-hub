import { provisionTestDb } from './db.js';

/**
 * Runs once before the entire e2e suite, before Playwright's `webServer`
 * entries are started. Provisions the throwaway test database so both the
 * real api server and the real web server (started next, via
 * playwright.config.ts's `webServer` array) connect to a ready schema.
 */
export default async function globalSetup(): Promise<void> {
  await provisionTestDb();
}
