import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateOrigin } from '@/lib/validate-origin';

function makeRequest(method: string, origin?: string) {
  const headers: Record<string, string> = { host: 'app.example.com' };
  if (origin) headers.origin = origin;
  return new NextRequest('https://app.example.com/api/trips', { method, headers });
}

describe('validateOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows a same-origin GET with no Origin header in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(validateOrigin(makeRequest('GET'))).toBeNull();
  });

  it('allows a same-origin HEAD with no Origin header in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(validateOrigin(makeRequest('HEAD'))).toBeNull();
  });

  it('rejects a POST with no Origin header in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const result = validateOrigin(makeRequest('POST'));
    expect(result?.status).toBe(403);
  });

  it('allows a POST with no Origin header outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(validateOrigin(makeRequest('POST'))).toBeNull();
  });

  it('allows a GET whose Origin header is on the allowlist', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(validateOrigin(makeRequest('GET', 'https://app.example.com'))).toBeNull();
  });

  it('rejects a GET whose Origin header is not on the allowlist', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const result = validateOrigin(makeRequest('GET', 'https://evil.example.com'));
    expect(result?.status).toBe(403);
  });

  it('rejects a POST whose Origin header is not on the allowlist', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const result = validateOrigin(makeRequest('POST', 'https://evil.example.com'));
    expect(result?.status).toBe(403);
  });
});
