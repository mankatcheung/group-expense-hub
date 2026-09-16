import { createAuthClient } from 'better-auth/react';

// Auth is served same-origin by app/api/auth/[...all]/route.ts. On the
// server (SSR of client components) there's no window, so fall back to the
// configured app URL.
const getBaseURL = () =>
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  basePath: '/api/auth',
});
