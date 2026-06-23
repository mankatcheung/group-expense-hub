import { removeTestDbFiles } from './db.js';

/**
 * Runs once after the entire e2e suite finishes (and after Playwright has
 * torn down the webServer processes), removing the throwaway test database
 * file so repeated local runs always start from a clean schema.
 */
export default async function globalTeardown(): Promise<void> {
  await removeTestDbFiles();
}
