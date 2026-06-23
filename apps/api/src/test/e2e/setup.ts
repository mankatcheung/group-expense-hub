import { execFileSync } from 'child_process';
import { rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveTestDbPath, resolveTestDbUrl } from './env.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../../../../..');

async function removeTestDbFiles() {
  const dbPath = resolveTestDbPath();
  await Promise.all(
    [dbPath, `${dbPath}-journal`, `${dbPath}-wal`].map((p) => rm(p, { force: true }))
  );
}

/**
 * Provisions a throwaway SQLite database for the e2e suite: a fresh schema
 * pushed via the real migration history, isolated from both the developer's
 * local dev.db and the production Turso database. Runs once before all e2e
 * test files; the returned function runs once after they all finish.
 */
export default async function setup() {
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

  return async function teardown() {
    await removeTestDbFiles();
  };
}
