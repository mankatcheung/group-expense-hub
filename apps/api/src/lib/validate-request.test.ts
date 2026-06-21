import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { FastifyReply } from 'fastify';
import { parseBody } from './validate-request.js';

const schema = z.object({ name: z.string().min(1) });

function mockReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply as unknown as FastifyReply;
}

describe('parseBody', () => {
  it('returns the parsed data when the body is valid', () => {
    const reply = mockReply();

    const result = parseBody(schema, { name: 'Alice' }, reply);

    expect(result).toEqual({ name: 'Alice' });
    expect(vi.mocked(reply.status)).not.toHaveBeenCalled();
  });

  it('sends a 400 and returns null when the body fails validation', () => {
    const reply = mockReply();

    const result = parseBody(schema, { name: '' }, reply);

    expect(result).toBeNull();
    expect(vi.mocked(reply.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(reply.send)).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('sends a 400 and returns null when the body is missing required fields', () => {
    const reply = mockReply();

    const result = parseBody(schema, {}, reply);

    expect(result).toBeNull();
    expect(vi.mocked(reply.status)).toHaveBeenCalledWith(400);
  });
});
