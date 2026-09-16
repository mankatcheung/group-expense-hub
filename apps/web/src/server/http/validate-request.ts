import type { ZodSchema } from 'zod';

export type ParseBodyResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Validates `body` against `schema`. Callers should check `ok` and return a
 * 400 with `message` when it's false - this function has no side effects.
 */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): ParseBodyResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message || 'Invalid request body' };
  }
  return { ok: true, data: result.data };
}
