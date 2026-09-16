import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseBody } from './validate-request';

const schema = z.object({ name: z.string().min(1) });

describe('parseBody', () => {
  it('returns the parsed data when the body is valid', () => {
    const result = parseBody(schema, { name: 'Alice' });

    expect(result).toEqual({ ok: true, data: { name: 'Alice' } });
  });

  it('returns ok: false with a message when the body fails validation', () => {
    const result = parseBody(schema, { name: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toEqual(expect.any(String));
  });

  it('returns ok: false when the body is missing required fields', () => {
    const result = parseBody(schema, {});

    expect(result.ok).toBe(false);
  });
});
