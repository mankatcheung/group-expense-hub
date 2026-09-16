import { describe, it, expect } from 'vitest';
import { findServerEnvProblems } from './env';

const validProduction = {
  NODE_ENV: 'production',
  VERCEL: '1',
  NEXT_PUBLIC_APP_URL: 'https://splittrip.example.com',
  TURSO_DATABASE_URL: 'libsql://splittrip.turso.io',
  TURSO_AUTH_TOKEN: 'token',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BREVO_API_KEY: 'brevo-key',
};

describe('findServerEnvProblems', () => {
  it('reports nothing outside production', () => {
    expect(findServerEnvProblems({ NODE_ENV: 'development' })).toEqual({ errors: [], warnings: [] });
  });

  it('accepts a complete production configuration', () => {
    expect(findServerEnvProblems(validProduction)).toEqual({ errors: [], warnings: [] });
  });

  it('reports every missing required variable at once', () => {
    const { errors } = findServerEnvProblems({ NODE_ENV: 'production' });

    expect(errors).toEqual([
      expect.stringContaining('BETTER_AUTH_SECRET'),
      expect.stringContaining('TURSO_DATABASE_URL'),
      expect.stringContaining('NEXT_PUBLIC_APP_URL'),
    ]);
  });

  it('rejects a short BETTER_AUTH_SECRET', () => {
    const { errors } = findServerEnvProblems({ ...validProduction, BETTER_AUTH_SECRET: 'short' });
    expect(errors).toEqual([expect.stringContaining('at least 32 characters')]);
  });

  it('rejects a local file database on Vercel', () => {
    const { errors } = findServerEnvProblems({ ...validProduction, TURSO_DATABASE_URL: 'file:./dev.db' });
    expect(errors).toEqual([expect.stringContaining('file:')]);
  });

  it('allows a local file database when not on Vercel (e.g. local `next start`)', () => {
    const local = { ...validProduction, VERCEL: undefined };
    const { errors } = findServerEnvProblems({ ...local, TURSO_DATABASE_URL: 'file:./dev.db', TURSO_AUTH_TOKEN: undefined });
    expect(errors).toEqual([]);
  });

  it('requires TURSO_AUTH_TOKEN for a remote database', () => {
    const { errors } = findServerEnvProblems({ ...validProduction, TURSO_AUTH_TOKEN: undefined });
    expect(errors).toEqual([expect.stringContaining('TURSO_AUTH_TOKEN')]);
  });

  it('rejects an invalid NEXT_PUBLIC_APP_URL', () => {
    const { errors } = findServerEnvProblems({ ...validProduction, NEXT_PUBLIC_APP_URL: 'splittrip.example.com' });
    expect(errors).toEqual([expect.stringContaining('NEXT_PUBLIC_APP_URL')]);
  });

  it('rejects a non-numeric AUTH_RATE_LIMIT_MAX, which would otherwise disable auth rate limiting', () => {
    const { errors } = findServerEnvProblems({ ...validProduction, AUTH_RATE_LIMIT_MAX: 'lots' });
    expect(errors).toEqual([expect.stringContaining('AUTH_RATE_LIMIT_MAX')]);
  });

  it('warns but does not fail when Brevo is not configured', () => {
    const { errors, warnings } = findServerEnvProblems({ ...validProduction, BREVO_API_KEY: undefined });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([expect.stringContaining('BREVO_API_KEY')]);
  });

  it('warns when DISABLE_ORIGIN_CHECK is on in production', () => {
    const { warnings } = findServerEnvProblems({ ...validProduction, DISABLE_ORIGIN_CHECK: 'true' });
    expect(warnings).toEqual([expect.stringContaining('DISABLE_ORIGIN_CHECK')]);
  });
});
