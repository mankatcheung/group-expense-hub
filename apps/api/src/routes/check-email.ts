import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../auth.js';
import { rateLimit } from '../plugins/ratelimit.js';
import { emailBloomFilter } from '../plugins/email-bloom-filter.js';
import { CheckEmailRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../lib/validate-request.js';

export default async function checkEmailRouter(fastify: FastifyInstance) {
  // GET /api/check-email?email=... - fast, unauthenticated pre-flight check
  // for the registration form. Not a substitute for the real uniqueness
  // check at actual sign-up time (see emailBloomFilter's own doc comment).
  fastify.get('/check-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const rateLimitResult = await rateLimit.api.limit(request.ip);
    if (!rateLimitResult.success) {
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    }

    const query = parseBody(CheckEmailRequestSchema, request.query, reply);
    if (!query) return;

    if (!emailBloomFilter.has(query.email)) {
      return { available: true };
    }

    // Bloom filter says "maybe taken" - confirm against the real database,
    // since false positives are possible (false negatives are not).
    const existing = await prisma.user.findUnique({
      where: { email: query.email },
      select: { id: true },
    });

    return { available: !existing };
  });
}
