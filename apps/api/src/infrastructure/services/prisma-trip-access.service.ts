import type { PrismaClient } from '@prisma/client';
import type { ITripAccessService, TripAccessLevel } from '../../application/ports/services/trip-access.service.js';

export function createPrismaTripAccessService({ prisma }: { prisma: PrismaClient }): ITripAccessService {
  async function getAccessLevel(tripId: string, userId: string): Promise<TripAccessLevel> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        userId: true,
        tripMembers: { where: { userId }, select: { id: true } },
      },
    });
    if (!trip) return null;
    if (trip.userId === userId) return 'owner';
    return trip.tripMembers.length > 0 ? 'collaborator' : null;
  }

  return {
    getAccessLevel,

    async canEdit(tripId, userId) {
      const level = await getAccessLevel(tripId, userId);
      return level === 'owner' || level === 'collaborator';
    },

    async isOwner(tripId, userId) {
      const level = await getAccessLevel(tripId, userId);
      return level === 'owner';
    },
  };
}
