import { describe, it, expect, vi } from 'vitest';
import { createBetterAuthService } from './better-auth.service';

function makeHeaders(cookie?: string): Headers {
  return new Headers(cookie ? { cookie } : undefined);
}

describe('createBetterAuthService', () => {
  it('returns null when there is no cookie', async () => {
    const mockAuth = { api: { getSession: vi.fn() } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeHeaders(undefined));
    expect(result).toBeNull();
    expect(mockAuth.api.getSession).not.toHaveBeenCalled();
  });

  it('returns null when getSession throws', async () => {
    const mockAuth = { api: { getSession: vi.fn().mockRejectedValue(new Error('network')) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeHeaders('session=abc'));
    expect(result).toBeNull();
  });

  it('returns null when the session is null', async () => {
    const mockAuth = { api: { getSession: vi.fn().mockResolvedValue(null) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeHeaders('session=abc'));
    expect(result).toBeNull();
  });

  it('returns the user from the session', async () => {
    const user = { id: 'user-1', name: 'Test', email: 'test@example.com', image: null };
    const mockAuth = { api: { getSession: vi.fn().mockResolvedValue({ user }) } };
    const service = createBetterAuthService({ auth: mockAuth });
    const result = await service.getCurrentUser(makeHeaders('session=abc'));
    expect(result).toEqual(user);
    const call = mockAuth.api.getSession.mock.calls[0]?.[0];
    expect(call.headers.get('cookie')).toBe('session=abc');
  });
});
