export function getTrustedOrigins(): string[] {
  const origins = ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000'];

  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);

  // Same allowlist validateOrigin applies to the other API routes, so an
  // extra domain (e.g. a custom domain alongside *.vercel.app) works for auth too.
  const allowed = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];
  origins.push(...allowed);

  return origins.filter(Boolean);
}
