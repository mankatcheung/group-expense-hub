import type { PrismaClient } from '@prisma/client';
import type { IInvitationRepository } from '../../application/ports/repositories/invitation.repository.js';
export function createPrismaInvitationRepository({ prisma }: { prisma: PrismaClient }): IInvitationRepository {
  return {
    async findPendingByEmail(email) {
      return prisma.tripInvitation.findMany({
        where: { email, status: 'pending', expiresAt: { gt: new Date() } },
        select: {
          id: true,
          token: true,
          tripId: true,
          createdAt: true,
          trip: {
            select: {
              name: true,
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });
    },

    async findById(id) {
      return prisma.tripInvitation.findUnique({
        where: { id },
        select: { id: true, tripId: true, email: true, role: true, expiresAt: true, status: true },
      });
    },

    async findByToken(token) {
      return prisma.tripInvitation.findUnique({
        where: { token },
        select: { id: true, tripId: true, status: true, expiresAt: true, role: true },
      });
    },

    async findByTripAndEmail(tripId, email) {
      return prisma.tripInvitation.findUnique({
        where: { tripId_email: { tripId, email } },
        select: { id: true, expiresAt: true, status: true },
      });
    },

    async upsert(tripId, email, token, expiresAt) {
      await prisma.tripInvitation.upsert({
        where: { tripId_email: { tripId, email } },
        update: { expiresAt, status: 'pending', token },
        create: { tripId, email, expiresAt, token },
      });
    },

    async markAccepted(id) {
      await prisma.tripInvitation.update({ where: { id }, data: { status: 'accepted' } });
    },
  };
}
