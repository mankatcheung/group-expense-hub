import 'dotenv/config';
import Fastify from 'fastify';
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

const PORT = parseInt(process.env.PORT || '4040');
const isDev = process.env.NODE_ENV !== 'production';

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
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
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

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`
╔═══════════════════════════════════════════════════════════╗
║                  🚀 API Server Ready                        ║
╠═══════════════════════════════════════════════════════════╣
║  URL:        http://localhost:${PORT}                         ║
║  Health:     http://localhost:${PORT}/health                  ║
║  Environment: ${isDev ? 'development' : 'production'.padEnd(24)}║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
