import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSession, getUserFromRequest } from '../lib/get-session.js';
import { auth } from '../auth.js';

vi.mock('../auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

describe('getSession', () => {
  it('should return null if no cookie provided', async () => {
    const result = await getSession(undefined);
    expect(result).toBeNull();
  });

  it('should return null if cookie is empty string', async () => {
    const result = await getSession('');
    expect(result).toBeNull();
  });

  it('should return session if cookie is valid', async () => {
    const mockSession = { user: { id: '1', email: 'test@example.com' } };
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const result = await getSession('valid-cookie');
    expect(result).toEqual(mockSession);
  });

  it('should return null if getSession throws', async () => {
    vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Invalid'));

    const result = await getSession('invalid-cookie');
    expect(result).toBeNull();
  });
});

describe('getUserFromRequest', () => {
  it('should throw Unauthorized if no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const mockRequest = {
      headers: { cookie: 'some-cookie' },
    } as any;

    await expect(getUserFromRequest(mockRequest)).rejects.toThrow('Unauthorized');
  });

  it('should return user from session', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: mockUser } as any);

    const mockRequest = {
      headers: { cookie: 'valid-cookie' },
    } as any;

    const result = await getUserFromRequest(mockRequest);
    expect(result).toEqual(mockUser);
  });
});
