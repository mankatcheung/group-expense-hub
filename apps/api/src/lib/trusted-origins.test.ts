import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTrustedOrigins } from './trusted-origins.js';

describe('getTrustedOrigins', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.BETTER_AUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('always includes the local dev origins', () => {
    const origins = getTrustedOrigins();

    expect(origins).toEqual([
      'http://localhost:3000',
      'http://localhost:4040',
      'https://localhost:3000',
      'https://localhost:4040',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4040',
    ]);
  });

  it('appends BETTER_AUTH_URL when set', () => {
    process.env.BETTER_AUTH_URL = 'https://api.example.com';

    expect(getTrustedOrigins()).toContain('https://api.example.com');
  });

  it('appends NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

    expect(getTrustedOrigins()).toContain('https://app.example.com');
  });

  it('appends NEXT_PUBLIC_API_URL when set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api2.example.com';

    expect(getTrustedOrigins()).toContain('https://api2.example.com');
  });

  it('appends all configured env-derived origins together', () => {
    process.env.BETTER_AUTH_URL = 'https://api.example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    process.env.NEXT_PUBLIC_API_URL = 'https://api2.example.com';

    const origins = getTrustedOrigins();

    expect(origins).toEqual([
      'http://localhost:3000',
      'http://localhost:4040',
      'https://localhost:3000',
      'https://localhost:4040',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4040',
      'https://api.example.com',
      'https://app.example.com',
      'https://api2.example.com',
    ]);
  });
});
