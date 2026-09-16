import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { AuthUser, IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';

export const testUser: AuthUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null };

export function makeRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function ctx<P extends Record<string, string>>(params: P) {
  return { params: Promise.resolve(params) };
}

export function authedService(user: AuthUser = testUser): IAuthService {
  return { getCurrentUser: vi.fn().mockResolvedValue(user) };
}

export function unauthedService(): IAuthService {
  return { getCurrentUser: vi.fn().mockResolvedValue(null) };
}

export function makeLimiter(success = true): IRateLimitService {
  return { limit: vi.fn().mockResolvedValue({ success, remaining: success ? 99 : 0, reset: 0 }) };
}
