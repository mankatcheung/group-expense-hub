import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { auth, prisma } from './auth.js';
import { createAppContainer } from './container/container.js';
import { createRequireAuth } from './presentation/middleware/require-auth.js';
import { createTripsPlugin } from './presentation/routes/trips.routes.js';
import { createMembersPlugin } from './presentation/routes/members.routes.js';
import { createExpensesPlugin } from './presentation/routes/expenses.routes.js';
import { createInvitationsPlugin } from './presentation/routes/invitations.routes.js';
import { createUserPlugin } from './presentation/routes/user.routes.js';
import { createCheckEmailPlugin } from './presentation/routes/check-email.routes.js';
import { seedEmailBloomFilter } from './plugins/email-bloom-filter.js';
import { getTrustedOrigins } from './lib/trusted-origins.js';

const isDev = process.env.NODE_ENV !== 'production';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: isDev
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              levelFirst: true,
              customColors: 'info:blue,warn:yellow,error:red',
              formatOpts: { colorize: true },
            },
          },
        }
      : true,
    requestIdHeader: 'x-request-id',
    genReqId: () => Math.random().toString(36).substring(2, 15),
  });

  fastify.addHook('onRequest', async (request) => {
    request.log.info({ url: request.url, method: request.method, origin: request.headers.origin, referer: request.headers.referer }, 'Incoming request');
  });

  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info({ url: request.url, method: request.method, statusCode: reply.statusCode, responseTime: reply.elapsedTime + 'ms' }, 'Request completed');
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error, url: request.url, method: request.method }, 'Request error');
    const statusCode = (error as any).statusCode || (error as any).status || 500;
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message;
    reply.status(statusCode).send({ error: message, statusCode, ...(isDev && { stack: error.stack }) });
  });

  await fastify.register(helmet, { contentSecurityPolicy: false });

  const trustedOrigins = getTrustedOrigins();
  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      callback(null, trustedOrigins.includes(origin));
    },
    credentials: true,
  });

  await fastify.register(cookie);

  fastify.get('/health', async () => ({ status: 'ok' }));

  const container = createAppContainer();

  // Seed bloom filter (best-effort — non-critical, falls back to DB query on miss)
  try {
    await seedEmailBloomFilter(prisma);
  } catch (error) {
    fastify.log.warn({ err: error }, 'Failed to seed email bloom filter, continuing without it');
  }

  // Auth passthrough — rate-limited and forwarded to better-auth handler
  const authRateLimiter = container.get('AUTH_RATE_LIMITER');
  await fastify.register(async (fastify) => {
    fastify.all('/api/auth/*', async (request, reply) => {
      const rl = await authRateLimiter.limit(request.ip);
      if (!rl.success) {
        return reply.status(429).send({ message: 'Too many requests. Please try again later.', code: 'TOO_MANY_REQUESTS' });
      }

      const path = request.url.replace('/api/auth', '');
      const method = request.method.toUpperCase();
      const headers: Record<string, string> = {};
      if (request.headers.cookie) headers.cookie = request.headers.cookie;
      if (request.headers['content-type']) headers['content-type'] = request.headers['content-type'];
      if (request.headers.origin) headers.origin = request.headers.origin;

      const authRequest = new Request(
        `${process.env.BETTER_AUTH_URL || 'http://localhost:4040'}/api/auth${path}`,
        { method, headers, body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(request.body) : undefined, credentials: 'include' }
      );

      const response = await auth.handler(authRequest);
      reply.status(response.status);
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) reply.header('set-cookie', setCookie);
      const contentType = response.headers.get('content-type');
      if (contentType) reply.header('content-type', contentType);
      const body = await response.text();
      return body ? JSON.parse(body) : {};
    });
  });

  const requireAuth = createRequireAuth(container.get('AUTH_SERVICE'));
  const apiRateLimiter = container.get('API_RATE_LIMITER');
  const emailRateLimiter = container.get('EMAIL_RATE_LIMITER');

  await fastify.register(createTripsPlugin({
    requireAuth,
    getTrips: container.get('GET_TRIPS_USE_CASE'),
    createTrip: container.get('CREATE_TRIP_USE_CASE'),
    getTrip: container.get('GET_TRIP_USE_CASE'),
    updateTrip: container.get('UPDATE_TRIP_USE_CASE'),
    deleteTrip: container.get('DELETE_TRIP_USE_CASE'),
    inviteMember: container.get('INVITE_MEMBER_USE_CASE'),
    joinTrip: container.get('JOIN_TRIP_USE_CASE'),
    removeCollaborator: container.get('REMOVE_COLLABORATOR_USE_CASE'),
    apiRateLimiter,
    authRateLimiter,
    emailRateLimiter,
  }), { prefix: '/api/trips' });

  await fastify.register(createMembersPlugin({
    requireAuth,
    createMember: container.get('CREATE_MEMBER_USE_CASE'),
    updateMember: container.get('UPDATE_MEMBER_USE_CASE'),
    deleteMember: container.get('DELETE_MEMBER_USE_CASE'),
    apiRateLimiter,
  }), { prefix: '/api/trips' });

  await fastify.register(createExpensesPlugin({
    requireAuth,
    createExpense: container.get('CREATE_EXPENSE_USE_CASE'),
    updateExpense: container.get('UPDATE_EXPENSE_USE_CASE'),
    deleteExpense: container.get('DELETE_EXPENSE_USE_CASE'),
    apiRateLimiter,
  }), { prefix: '/api/trips' });

  await fastify.register(createInvitationsPlugin({
    requireAuth,
    getInvitations: container.get('GET_INVITATIONS_USE_CASE'),
    acceptInvitation: container.get('ACCEPT_INVITATION_USE_CASE'),
    apiRateLimiter,
  }), { prefix: '/api/invitations' });

  await fastify.register(createUserPlugin({
    requireAuth,
    updateProfile: container.get('UPDATE_PROFILE_USE_CASE'),
    authRateLimiter,
  }), { prefix: '/api/user' });

  await fastify.register(createCheckEmailPlugin({
    checkEmail: container.get('CHECK_EMAIL_USE_CASE'),
    apiRateLimiter,
  }), { prefix: '/api' });

  return fastify;
}
