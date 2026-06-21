import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../auth.js';
import { getUserFromRequest } from '../lib/get-session.js';
import { rateLimit } from '../plugins/ratelimit.js';

const COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

function getRandomColor() {
  const index = Math.floor(Math.random() * COLORS.length);
  return COLORS[index] ?? '#16553b';
}

export default async function invitationsRouter(fastify: FastifyInstance) {
  // GET /api/invitations - Get pending invitations
  fastify.get('/', async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = await getUserFromRequest(request);

    const invitations = await prisma.tripInvitation.findMany({
      where: {
        email: user.email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        token: true,
        tripId: true,
        createdAt: true,
        trip: {
          select: {
            name: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return invitations.map(inv => ({
      id: inv.id,
      token: inv.token,
      tripId: inv.tripId,
      tripName: inv.trip.name,
      inviter: inv.trip.user,
      createdAt: inv.createdAt.toISOString(),
    }));
  });

  // POST /api/invitations/:id/accept - Accept invitation
  fastify.post('/:id/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await getUserFromRequest(request);
    const userId = user.id;

    const rateLimitResult = await rateLimit.api.limit(user.id);
    if (!rateLimitResult.success) {
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    }

    const invitation = await prisma.tripInvitation.findUnique({
      where: { id },
      select: { id: true, tripId: true, email: true, role: true, expiresAt: true, status: true },
    });

    if (!invitation) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    if (invitation.email !== user.email) {
      return reply.status(403).send({ error: 'This invitation is not for you' });
    }

    if (invitation.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invitation expired' });
    }

    if (invitation.status !== 'pending') {
      return reply.status(400).send({ error: 'Invitation already used' });
    }

    const existingMember = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId: invitation.tripId,
          userId,
        },
      },
    });

    if (existingMember) {
      return reply.status(400).send({ error: 'Already a member' });
    }

    await prisma.$transaction([
      prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          userId,
          role: invitation.role || 'collaborator',
        },
      }),
      prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          name: user.name ?? user.email.split('@')[0] ?? 'User',
          color: getRandomColor(),
          tripId: invitation.tripId,
        },
      }),
      prisma.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      }),
    ]);

    return { success: true, tripId: invitation.tripId };
  });
}
