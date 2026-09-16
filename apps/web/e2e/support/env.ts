import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the throwaway SQLite file used by the web e2e suite,
 * separate from the developer's local dev.db. Must be absolute (not
 * `file:./e2e-test.db`) because the schema-push step runs with a different
 * CWD (packages/db) than the web server process (apps/web).
 */
export function resolveTestDbPath(): string {
  return path.resolve(dirname, '../../.web-e2e-test.db');
}

export function resolveTestDbUrl(): string {
  return `file:${resolveTestDbPath()}`;
}

// A non-default port avoids colliding with a developer's already-running
// `pnpm dev` on 3000.
export const TEST_WEB_PORT = 3100;
export const TEST_WEB_URL = `http://localhost:${TEST_WEB_PORT}`;
