import { provisionTestDb } from './db.js';

/**
 * Runs once before the entire e2e suite, before Playwright's `webServer` is
 * started. Provisions the throwaway test database so the real web server
 * (started next, via playwright.config.ts) connects to a ready schema.
 */
export default async function globalSetup(): Promise<void> {
  await provisionTestDb();
}
