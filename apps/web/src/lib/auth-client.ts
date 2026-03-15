import { createAuthClient } from 'better-auth/react';

const isDev = process.env.NODE_ENV !== 'production';

export const authClient = createAuthClient({
  baseURL: isDev ? 'http://localhost:4040' : '/api/auth',
});
