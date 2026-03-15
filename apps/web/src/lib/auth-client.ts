import { createAuthClient } from 'better-auth/react';

const isDev = process.env.NODE_ENV === 'development';

const getBaseURL = () => {
  if (isDev) return 'http://localhost:4040';

  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040';
  }

  return window.location.origin + '/api/auth';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});
