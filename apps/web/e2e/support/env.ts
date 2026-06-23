import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the throwaway SQLite file used by the web e2e suite.
 * Deliberately a separate file from apps/api's own e2e db
 * (apps/api/.e2e-test.db) so the two suites never race on the same file if
 * run concurrently, and from the developer's local dev.db. Must be absolute
 * (not `file:./e2e-test.db`) because the schema-push step runs with a
 * different CWD (packages/db) than the API server process (apps/api).
 */
export function resolveTestDbPath(): string {
  return path.resolve(dirname, '../../.web-e2e-test.db');
}

export function resolveTestDbUrl(): string {
  return `file:${resolveTestDbPath()}`;
}

// Must be 4040: apps/web/src/lib/auth-client.ts hardcodes
// `http://localhost:4040` as the better-auth client baseURL whenever
// `NODE_ENV === 'development'` (it only reads NEXT_PUBLIC_API_URL in
// production), so the browser's auth calls can't be redirected to a
// different port via env vars alone. The web dev server itself has no such
// constraint, so it runs on a non-default port (3100) to avoid colliding
// with a developer's already-running `pnpm dev` on 3000.
export const TEST_API_PORT = 4040;
export const TEST_WEB_PORT = 3100;
export const TEST_API_URL = `http://localhost:${TEST_API_PORT}`;
export const TEST_WEB_URL = `http://localhost:${TEST_WEB_PORT}`;
