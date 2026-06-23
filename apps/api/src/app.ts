import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { auth } from './auth.js';
import tripsRouter from './routes/trips.js';
import membersRouter from './routes/members.js';
import expensesRouter from './routes/expenses.js';
import invitationsRouter from './routes/invitations.js';
import userRouter from './routes/user.js';
import { rateLimit } from './plugins/ratelimit.js';
import { getTrustedOrigins } from './lib/trusted-origins.js';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Builds and fully configures the Fastify instance (plugins, hooks, routes)
 * without binding to a network port. Used by the real server entrypoint
 * (index.ts) and by e2e tests, which exercise the real app via inject()
 * instead of listen().
 */
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
              formatOpts: {
                colorize: true,
              },
            },
          },
        }
      : true,
    requestIdHeader: 'x-request-id',
    genReqId: () => Math.random().toString(36).substring(2, 15),
  });

  fastify.addHook('onRequest', async (request, _reply) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        origin: request.headers.origin,
        referer: request.headers.referer,
      },
      'Incoming request'
    );
  });

  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime + 'ms',
      },
      'Request completed'
    );
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error, url: request.url, method: request.method }, 'Request error');

    const statusCode = (error as any).statusCode || (error as any).status || 500;
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message;

    reply.status(statusCode).send({
      error: message,
      statusCode,
      ...(isDev && { stack: error.stack }),
    });
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  const trustedOrigins = getTrustedOrigins();

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow non-browser/same-origin requests (no Origin header).
      if (!origin) return callback(null, true);
      callback(null, trustedOrigins.includes(origin));
    },
    credentials: true,
  });

  await fastify.register(cookie);

  fastify.decorate('rateLimit', rateLimit);

  fastify.get('/health', async () => ({ status: 'ok' }));

  await fastify.register(async function (fastify) {
    fastify.all('/api/auth/*', async (request, reply) => {
      const rateLimitResult = await rateLimit.auth.limit(request.ip);
      if (!rateLimitResult.success) {
        // better-auth's client reads `message` (matching its own APIError
        // shape), not `error` - the latter is only correctly read by our own
        // fetchApi wrapper, which doesn't handle this auth-forwarder route.
        return reply.status(429).send({
          message: 'Too many requests. Please try again later.',
          code: 'TOO_MANY_REQUESTS',
        });
      }

      const path = request.url.replace('/api/auth', '');
      const method = request.method.toUpperCase();

      const headers: Record<string, string> = {};
      if (request.headers.cookie) {
        headers.cookie = request.headers.cookie;
      }
      if (request.headers['content-type']) {
        headers['content-type'] = request.headers['content-type'];
      }
      // better-auth's own origin-check middleware only runs when the request
      // carries a cookie (e.g. sign-out, where a session already exists) and
      // requires this header to be present and trusted - without forwarding
      // it, authenticated actions like sign-out fail with 403 MISSING_OR_NULL_ORIGIN.
      if (request.headers.origin) {
        headers.origin = request.headers.origin;
      }

      const authRequest = new Request(
        `${process.env.BETTER_AUTH_URL || 'http://localhost:4040'}/api/auth${path}`,
        {
          method,
          headers,
          body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
          credentials: 'include',
        }
      );

      const response = await auth.handler(authRequest);

      reply.status(response.status);

      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        reply.header('set-cookie', setCookie);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        reply.header('content-type', contentType);
      }

      const body = await response.text();
      return body ? JSON.parse(body) : {};
    });
  });

  await fastify.register(tripsRouter, { prefix: '/api/trips' });
  await fastify.register(membersRouter, { prefix: '/api/trips' });
  await fastify.register(expensesRouter, { prefix: '/api/trips' });
  await fastify.register(invitationsRouter, { prefix: '/api/invitations' });
  await fastify.register(userRouter, { prefix: '/api/user' });

  return fastify;
}
