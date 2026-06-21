import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { rateLimit } from '../plugins/ratelimit.js';
import { UpdateProfileRequestSchema } from '@group-expense-hub/db/schemas';
import { parseBody } from '../lib/validate-request.js';

export default async function userRouter(fastify: FastifyInstance) {
  // PUT /api/user/profile - Update profile
  fastify.put('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromRequest(request);
    const body = parseBody(UpdateProfileRequestSchema, request.body, reply);
    if (!body) return;

    const rateLimitResult = await rateLimit.auth.limit(user.id);
    if (!rateLimitResult.success) {
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    }

    if (body.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: body.name },
      });
    }

    if (body.email && body.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'Email already in use' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { email: body.email },
      });
    }

    return { success: true };
  });

  // POST /api/user/password - Change password
  fastify.post('/password', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromRequest(request);

    const rateLimitResult = await rateLimit.auth.limit(user.id);
    if (!rateLimitResult.success) {
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    }

    return { success: true };
  });
}
