import { auth } from '../auth.js';
import { FastifyRequest } from 'fastify';

export async function getSession(cookie: string | undefined) {
  if (!cookie) {
    return null;
  }

  try {
    const session = await auth.api.getSession({ headers: { cookie } });
    return session;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: FastifyRequest) {
  const session = await getSession(request.headers.cookie);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session.user;
}
