import { describe, it, expect, vi } from 'vitest';
import { createBetterAuthService } from './better-auth.service.js';
import type { FastifyRequest } from 'fastify';

function makeRequest(cookie?: string): FastifyRequest {
  return { headers: { cookie } } as unknown as FastifyRequest;
}

describe('createBetterAuthService', () => {
  it('returns null when there is no cookie', async () => {
    const mockAuth = { api: { getSession: vi.fn() } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeRequest(undefined));
    expect(result).toBeNull();
    expect(mockAuth.api.getSession).not.toHaveBeenCalled();
  });

  it('returns null when getSession throws', async () => {
    const mockAuth = { api: { getSession: vi.fn().mockRejectedValue(new Error('network')) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeRequest('session=abc'));
    expect(result).toBeNull();
  });

  it('returns null when the session is null', async () => {
    const mockAuth = { api: { getSession: vi.fn().mockResolvedValue(null) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeRequest('session=abc'));
    expect(result).toBeNull();
  });

  it('returns the user from the session', async () => {
    const user = { id: 'user-1', name: 'Test', email: 'test@example.com', image: null };
    const mockAuth = { api: { getSession: vi.fn().mockResolvedValue({ user }) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeRequest('session=abc'));
    expect(result).toEqual(user);
    expect(mockAuth.api.getSession).toHaveBeenCalledWith({ headers: { cookie: 'session=abc' } });
  });
});
