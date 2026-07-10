import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPrismaTripAccessService } from './prisma-trip-access.service.js';

const mockPrisma = {
  trip: { findUnique: vi.fn() },
};

const service = createPrismaTripAccessService({ prisma: mockPrisma as any });

describe('PrismaTripAccessService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAccessLevel', () => {
    it('returns null when the trip does not exist', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);
      expect(await service.getAccessLevel('trip-1', 'user-1')).toBeNull();
    });

    it('returns owner when the user owns the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'user-1', tripMembers: [] });
      expect(await service.getAccessLevel('trip-1', 'user-1')).toBe('owner');
    });

    it('returns collaborator when the user is a trip member but not the owner', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'owner-1', tripMembers: [{ id: 'tm-1' }] });
      expect(await service.getAccessLevel('trip-1', 'user-2')).toBe('collaborator');
    });

    it('returns null when the user is neither the owner nor a member', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'owner-1', tripMembers: [] });
      expect(await service.getAccessLevel('trip-1', 'stranger')).toBeNull();
    });
  });

  describe('canEdit', () => {
    it('returns true for the owner', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'user-1', tripMembers: [] });
      expect(await service.canEdit('trip-1', 'user-1')).toBe(true);
    });

    it('returns true for a collaborator', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'owner-1', tripMembers: [{ id: 'tm-1' }] });
      expect(await service.canEdit('trip-1', 'user-2')).toBe(true);
    });

    it('returns false for an unrelated user', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'owner-1', tripMembers: [] });
      expect(await service.canEdit('trip-1', 'stranger')).toBe(false);
    });

    it('returns false when the trip does not exist', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);
      expect(await service.canEdit('missing-trip', 'user-1')).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('returns true for the trip owner', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'user-1', tripMembers: [] });
      expect(await service.isOwner('trip-1', 'user-1')).toBe(true);
    });

    it('returns false for a collaborator', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ userId: 'owner-1', tripMembers: [{ id: 'tm-1' }] });
      expect(await service.isOwner('trip-1', 'user-2')).toBe(false);
    });
  });
});
