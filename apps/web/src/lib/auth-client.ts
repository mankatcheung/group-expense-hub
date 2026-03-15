import { createAuthClient } from 'better-auth/react';

const isDev = process.env.NODE_ENV === 'development';
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const authClient = createAuthClient({
  baseURL: isDev ? 'http://localhost:4040' : apiUrl || 'http://localhost:4040',
});
