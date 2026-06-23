import { execFileSync } from 'child_process';
import { rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveTestDbPath, resolveTestDbUrl } from './env.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../../../..');

export async function removeTestDbFiles(): Promise<void> {
  const dbPath = resolveTestDbPath();
  await Promise.all(
    [dbPath, `${dbPath}-journal`, `${dbPath}-wal`].map((p) => rm(p, { force: true }))
  );
}

/**
 * Provisions a throwaway SQLite database for the web e2e suite: a fresh
 * schema pushed via the real migration history (not a `db push` snapshot),
 * isolated from the developer's local dev.db, the production Turso
 * database, and apps/api's own e2e test db. Mirrors
 * apps/api/src/test/e2e/setup.ts.
 */
export async function provisionTestDb(): Promise<void> {
  await removeTestDbFiles();

  const env = { ...process.env, TURSO_DATABASE_URL: resolveTestDbUrl() };

  execFileSync('pnpm', ['--filter', '@group-expense-hub/db', 'generate'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  execFileSync('pnpm', ['--filter', '@group-expense-hub/db', 'migrate:deploy'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });
}
