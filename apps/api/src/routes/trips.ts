import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../auth.js';
import { rateLimit } from '../plugins/ratelimit.js';
import { INVITATION } from '@group-expense-hub/db/constants';
import {
  CreateTripRequestSchema,
  UpdateTripRequestSchema,
  InviteMemberRequestSchema,
} from '@group-expense-hub/db/schemas';
import { getUserFromRequest } from '../lib/get-session.js';
import { getRandomColor } from '../lib/colors.js';
import { parseBody } from '../lib/validate-request.js';
import {
  sendTripInvitationEmail,
  sendTripAddedNotification,
  getAppUrl,
} from '../services/email.js';

type TripAccessLevel = 'owner' | 'collaborator' | null;

export async function getTripAccessLevel(
  tripId: string,
  userId: string
): Promise<TripAccessLevel> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { userId: true },
  });

  if (!trip) return null;
  if (trip.userId === userId) return 'owner';

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });

  return member ? 'collaborator' : null;
}

export async function canEditTrip(tripId: string, userId: string) {
  const access = await getTripAccessLevel(tripId, userId);
  return access === 'owner' || access === 'collaborator';
}

const tripInclude = {
  members: true,
  expenses: { include: { splits: true } },
  tripMembers: { include: { user: true } },
  user: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.TripInclude;

type TripWithRelations = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

function formatTrip(trip: TripWithRelations, userId: string) {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt.toISOString(),
    isOwner: trip.userId === userId,
    owner: trip.user
      ? { id: trip.user.id, name: trip.user.name, email: trip.user.email, image: trip.user.image }
      : null,
    members: trip.members.map(m => ({ id: m.id, name: m.name, color: m.color })),
    tripMembers: trip.tripMembers.map(tm => ({
      id: tm.id,
      userId: tm.userId,
      role: tm.role,
      user: { id: tm.user.id, name: tm.user.name, email: tm.user.email, image: tm.user.image },
    })),
    expenses: trip.expenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date.toISOString(),
      paidBy: e.paidById,
      splitAmong: e.splits.map(s => s.memberId),
    })),
  };
}

export default async function tripsRouter(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = await getUserFromRequest(request);

    const ownedTrips = await prisma.trip.findMany({
      where: { userId: user.id },
      include: tripInclude,
      orderBy: { createdAt: 'desc' },
    });

    const collaboratorTripIds = await prisma.tripMember.findMany({
      where: { userId: user.id },
      select: { tripId: true },
    });

    const collaboratorTrips = await prisma.trip.findMany({
      where: { id: { in: collaboratorTripIds.map(t => t.tripId) } },
      include: tripInclude,
      orderBy: { createdAt: 'desc' },
    });

    return [...ownedTrips, ...collaboratorTrips].map(trip => formatTrip(trip, user.id));
  });

  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserFromRequest(request);
    const body = parseBody(CreateTripRequestSchema, request.body, reply);
    if (!body) return;

    const trip = await prisma.trip.create({
      data: {
        id: body.id,
        name: body.name,
        createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
        userId: user.id,
      },
    });

    return {
      id: trip.id,
      name: trip.name,
      members: [],
      tripMembers: [],
      expenses: [],
      createdAt: trip.createdAt.toISOString(),
      isOwner: true,
      owner: null,
    };
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await getUserFromRequest(request);

    const hasAccess = await getTripAccessLevel(id, user.id);
    if (!hasAccess) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: tripInclude,
    });

    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    return formatTrip(trip, user.id);
  });

  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await getUserFromRequest(request);
    const body = parseBody(UpdateTripRequestSchema, request.body, reply);
    if (!body) return;

    const canEdit = await canEditTrip(id, user.id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'Not authorized to edit this trip' });
    }

    return prisma.trip.update({ where: { id }, data: { name: body.name } });
  });

  fastify.delete('/:id', async (request: FastifyRequest, _reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = await getUserFromRequest(request);

    await prisma.trip.delete({ where: { id, userId: user.id } });
    return { success: true };
  });

  fastify.post('/:id/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: tripId } = request.params as { id: string };
    const user = await getUserFromRequest(request);
    const body = parseBody(InviteMemberRequestSchema, request.body, reply);
    if (!body) return;

    const rateLimitResult = await rateLimit.email.limit(user.id);
    if (!rateLimitResult.success) {
      return reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    }

    const access = await getTripAccessLevel(tripId, user.id);
    if (access !== 'owner') {
      return reply.status(403).send({ error: 'Only the owner can invite members' });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { name: true, user: { select: { name: true, email: true } } },
    });

    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const inviterName = trip.user?.name || trip.user?.email || 'Someone';
    const userToInvite = await prisma.user.findUnique({ where: { email: body.email } });

    if (!userToInvite) {
      const existingInvitation = await prisma.tripInvitation.findUnique({
        where: { tripId_email: { tripId, email: body.email } },
      });

      if (existingInvitation && existingInvitation.expiresAt > new Date()) {
        return { success: true, message: 'Invitation already sent', pending: true };
      }

      const token = crypto.randomUUID();

      await prisma.tripInvitation.upsert({
        where: { tripId_email: { tripId, email: body.email } },
        update: {
          expiresAt: new Date(Date.now() + INVITATION.EXPIRES_IN),
          status: 'pending',
          token,
        },
        create: {
          tripId,
          email: body.email,
          expiresAt: new Date(Date.now() + INVITATION.EXPIRES_IN),
          token,
        },
      });

      await sendTripInvitationEmail({
        to: body.email,
        inviterName,
        tripName: trip.name,
        inviteUrl: `${getAppUrl()}/join/${token}`,
      });

      return { success: true, message: `Invitation sent to ${body.email}`, pending: true };
    }

    const existingMember = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: userToInvite.id } },
    });

    if (existingMember) {
      return reply.status(400).send({ error: 'User is already a member' });
    }

    if (userToInvite.id === user.id) {
      return reply.status(400).send({ error: 'Cannot invite yourself' });
    }

    const [, member] = await prisma.$transaction([
      prisma.tripMember.create({ data: { tripId, userId: userToInvite.id, role: 'collaborator' } }),
      prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          name: userToInvite.name ?? userToInvite.email.split('@')[0] ?? 'User',
          color: getRandomColor(),
          tripId,
        },
      }),
    ]);

    await sendTripAddedNotification({
      to: userToInvite.email,
      name: userToInvite.name,
      inviterName,
      tripName: trip.name,
      tripUrl: `${getAppUrl()}/trip/${tripId}`,
    });

    return {
      success: true,
      message: 'User added to trip',
      user: {
        id: userToInvite.id,
        name: userToInvite.name,
        email: userToInvite.email,
        image: userToInvite.image,
      },
      member: { id: member.id, name: member.name, color: member.color },
    };
  });

  fastify.delete(
    '/:id/collaborators/:memberId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: tripId, memberId } = request.params as { id: string; memberId: string };
      const user = await getUserFromRequest(request);

      const access = await getTripAccessLevel(tripId, user.id);
      if (access !== 'owner') {
        return reply.status(403).send({ error: 'Only the owner can remove members' });
      }

      const tripMember = await prisma.tripMember.findUnique({
        where: { id: memberId },
        select: { user: { select: { name: true, email: true } } },
      });

      if (!tripMember) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      await prisma.$transaction([
        prisma.tripMember.delete({ where: { id: memberId } }),
        prisma.member.deleteMany({
          where: { tripId, name: tripMember.user.name || tripMember.user.email.split('@')[0] },
        }),
      ]);

      return { success: true };
    }
  );

  fastify.post('/join/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as { token: string };
    const user = await getUserFromRequest(request);

    const invitation = await prisma.tripInvitation.findUnique({
      where: { token },
      select: { id: true, tripId: true, status: true, expiresAt: true, role: true },
    });

    if (!invitation) return reply.status(404).send({ error: 'Invalid invitation' });
    if (invitation.expiresAt < new Date())
      return reply.status(400).send({ error: 'Invitation expired' });
    if (invitation.status !== 'pending')
      return reply.status(400).send({ error: 'Invitation already used' });

    const existingMember = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: invitation.tripId, userId: user.id } },
    });
    if (existingMember) return reply.status(400).send({ error: 'Already a member' });

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const tripMembers = await prisma.member.findMany({
      where: { tripId: invitation.tripId },
      select: { name: true },
    });
    const existingNames = new Set(tripMembers.map(m => m.name.toLowerCase()));
    const emailPrefix = userData?.email?.split('@')[0] ?? 'User';
    const proposedName = userData?.name ?? emailPrefix;
    const memberName = existingNames.has(proposedName.toLowerCase()) ? emailPrefix : proposedName;

    await prisma.$transaction([
      prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          userId: user.id,
          role: invitation.role || 'collaborator',
        },
      }),
      prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          name: memberName,
          color: getRandomColor(),
          tripId: invitation.tripId,
        },
      }),
      prisma.tripInvitation.update({ where: { id: invitation.id }, data: { status: 'accepted' } }),
    ]);

    return { success: true, tripId: invitation.tripId };
  });
}
