type Env = Record<string, string | undefined>;

export type ServerEnvProblems = { errors: string[]; warnings: string[] };

const MIN_SECRET_LENGTH = 32;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Production misconfiguration otherwise fails quietly: the Prisma client
 * falls back to a local `file:./dev.db`, auth falls back to a localhost
 * base URL, and a non-numeric AUTH_RATE_LIMIT_MAX disables auth rate
 * limiting. Development keeps those fallbacks, so only production is checked.
 */
export function findServerEnvProblems(env: Env = process.env): ServerEnvProblems {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (env.NODE_ENV !== 'production') return { errors, warnings };

  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    errors.push('BETTER_AUTH_SECRET is not set.');
  } else if (secret.length < MIN_SECRET_LENGTH) {
    errors.push(`BETTER_AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }

  const dbUrl = env.TURSO_DATABASE_URL;
  if (!dbUrl) {
    errors.push('TURSO_DATABASE_URL is not set.');
  } else if (dbUrl.startsWith('file:')) {
    if (env.VERCEL) errors.push('TURSO_DATABASE_URL uses a local file: database, which cannot work on Vercel.');
  } else if (!env.TURSO_AUTH_TOKEN) {
    errors.push('TURSO_AUTH_TOKEN is not set for the remote TURSO_DATABASE_URL.');
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is not set (auth base URL, trusted origins, and email links depend on it).');
  } else if (!isValidUrl(appUrl)) {
    errors.push('NEXT_PUBLIC_APP_URL is not a valid absolute URL.');
  }

  const rateLimitMax = env.AUTH_RATE_LIMIT_MAX;
  if (rateLimitMax !== undefined && !/^[1-9]\d*$/.test(rateLimitMax)) {
    errors.push('AUTH_RATE_LIMIT_MAX must be a positive integer.');
  }

  if (!env.BREVO_API_KEY) {
    warnings.push('BREVO_API_KEY is not set: password reset and invitation emails will not be sent.');
  }

  if (env.DISABLE_ORIGIN_CHECK === 'true') {
    warnings.push('DISABLE_ORIGIN_CHECK is enabled: better-auth will not verify request origins.');
  }

  return { errors, warnings };
}

export function assertServerEnv(env: Env = process.env): void {
  const { errors, warnings } = findServerEnvProblems(env);
  for (const warning of warnings) console.warn(`[env] ${warning}`);
  if (errors.length > 0) {
    throw new Error(`Invalid server environment:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
