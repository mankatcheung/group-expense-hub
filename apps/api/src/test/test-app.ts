import Fastify, { FastifyPluginAsync } from 'fastify';

/**
 * Builds a minimal Fastify instance with a single route plugin registered,
 * mirroring how index.ts mounts it (same prefix), without pulling in the
 * real server's auth/cors/logging setup. Callers mock '../auth.js',
 * '../lib/get-session.js', and '../plugins/ratelimit.js' before importing
 * the router under test.
 */
export async function buildTestApp(plugin: FastifyPluginAsync, prefix: string) {
  const app = Fastify();
  await app.register(plugin, { prefix });
  await app.ready();
  return app;
}
