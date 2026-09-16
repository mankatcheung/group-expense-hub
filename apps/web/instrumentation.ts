import * as Sentry from '@sentry/nextjs';

const isSentryEnabled =
  process.env.NODE_ENV === 'production' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export async function register() {
  if (isSentryEnabled && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (isSentryEnabled && process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  // Refuse to start a production server with missing or invalid secrets,
  // rather than failing per-request later. Runs after Sentry so the failure
  // is reported.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertServerEnv } = await import('./src/server/env');
    assertServerEnv();
  }
}

export const onRequestError = isSentryEnabled ? Sentry.captureRequestError : () => {};
