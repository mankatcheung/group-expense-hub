import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the throwaway SQLite file used by the e2e suite. Must be
 * absolute (not `file:./e2e-test.db`) because the schema-push step runs with
 * a different CWD (packages/db) than the test runner (apps/api).
 */
export function resolveTestDbPath(): string {
  return path.resolve(dirname, '../../../.e2e-test.db');
}

export function resolveTestDbUrl(): string {
  return `file:${resolveTestDbPath()}`;
}
