import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authClient } from '@/lib/auth-client';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    getSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
}));

const refetch = vi.fn();
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u1', name: 'Pat', email: 'pat@example.com', emailVerified: false, createdAt: new Date(), updatedAt: new Date() } },
      isPending: false,
      refetch,
    } as never);
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null } as never);
  });

  it('exposes the session user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Pat');
  });

  it('refreshUser bypasses the session cookie cache before refetching, so profile edits show immediately', async () => {
    const calls: string[] = [];
    vi.mocked(authClient.getSession).mockImplementation((async () => {
      calls.push('getSession');
      return { data: null, error: null };
    }) as never);
    refetch.mockImplementation(async () => {
      calls.push('refetch');
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(() => result.current.refreshUser());

    expect(authClient.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
    expect(calls).toEqual(['getSession', 'refetch']);
  });

  it('login throws the auth error message', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ error: { message: 'Invalid email or password' } } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(result.current.login('pat@example.com', 'wrong')).rejects.toThrow('Invalid email or password');
    expect(refetch).not.toHaveBeenCalled();
  });
});
