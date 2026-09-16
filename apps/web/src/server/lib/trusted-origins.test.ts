import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTrustedOrigins } from './trusted-origins';

describe('getTrustedOrigins', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('always includes the local dev origins', () => {
    const origins = getTrustedOrigins();

    expect(origins).toEqual([
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('appends NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

    const origins = getTrustedOrigins();

    expect(origins).toEqual([
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://app.example.com',
    ]);
  });

  it('appends each ALLOWED_ORIGINS entry, trimmed and ignoring blanks', () => {
    process.env.ALLOWED_ORIGINS = 'https://custom.example.com, https://other.example.com,';

    const origins = getTrustedOrigins();

    expect(origins).toContain('https://custom.example.com');
    expect(origins).toContain('https://other.example.com');
    expect(origins).not.toContain('');
  });
});
