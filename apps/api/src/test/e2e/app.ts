import type { FastifyInstance } from 'fastify';

/**
 * Builds the real app for e2e tests via a dynamic import, deliberately not a
 * static top-level one - this guarantees `../../app.js` (and transitively
 * `../../auth.js`) isn't evaluated until the calling test file actually runs,
 * by which point the worker has already picked up `TURSO_DATABASE_URL` from
 * vitest.e2e.config.ts's `test.env`.
 */
export async function buildE2EApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../../app.js');
  return buildApp();
}
