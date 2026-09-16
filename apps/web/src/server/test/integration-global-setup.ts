import { execFileSync } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    templateDbPath: string;
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

/**
 * Applies the real migration history (not a `db push` snapshot) once to a
 * template SQLite file; each integration test file copies it so files can
 * run in parallel without sharing state.
 */
export default async function setup(project: TestProject) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'geh-integration-'));
  const templateDbPath = path.join(dir, 'template.db');

  execFileSync('pnpm', ['--filter', '@group-expense-hub/db', 'migrate:deploy'], {
    cwd: repoRoot,
    env: { ...process.env, TURSO_DATABASE_URL: `file:${templateDbPath}`, TURSO_AUTH_TOKEN: '' },
    stdio: 'pipe',
  });

  project.provide('templateDbPath', templateDbPath);

  return async () => {
    await rm(dir, { recursive: true, force: true });
  };
}
