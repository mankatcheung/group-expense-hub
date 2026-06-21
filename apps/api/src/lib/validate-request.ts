import type { FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';

/**
 * Validates `body` against `schema`, sending a 400 response and returning
 * null on failure. Callers should `return` immediately when this returns
 * null — the response has already been sent.
 */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.status(400).send({ error: result.error.issues[0]?.message || 'Invalid request body' });
    return null;
  }
  return result.data;
}
