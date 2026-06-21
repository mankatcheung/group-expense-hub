import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTripAccessLevel, canEditTrip } from './trips.js';
import { prisma } from '../auth.js';

vi.mock('../auth.js', () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    tripMember: { findUnique: vi.fn() },
  },
}));

describe('getTripAccessLevel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when the trip does not exist', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

    const access = await getTripAccessLevel('trip-1', 'user-1');

    expect(access).toBeNull();
  });

  it('returns owner when the user owns the trip', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'user-1' } as never);

    const access = await getTripAccessLevel('trip-1', 'user-1');

    expect(access).toBe('owner');
    expect(prisma.tripMember.findUnique).not.toHaveBeenCalled();
  });

  it('returns collaborator when the user is a trip member but not the owner', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'owner-1' } as never);
    vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({ id: 'tm-1' } as never);

    const access = await getTripAccessLevel('trip-1', 'user-2');

    expect(access).toBe('collaborator');
  });

  it('returns null when the user is neither the owner nor a member', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'owner-1' } as never);
    vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);

    const access = await getTripAccessLevel('trip-1', 'stranger');

    expect(access).toBeNull();
  });
});

describe('canEditTrip', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true for the owner', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'user-1' } as never);

    await expect(canEditTrip('trip-1', 'user-1')).resolves.toBe(true);
  });

  it('returns true for a collaborator', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'owner-1' } as never);
    vi.mocked(prisma.tripMember.findUnique).mockResolvedValue({ id: 'tm-1' } as never);

    await expect(canEditTrip('trip-1', 'user-2')).resolves.toBe(true);
  });

  it('returns false for an unrelated user', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ userId: 'owner-1' } as never);
    vi.mocked(prisma.tripMember.findUnique).mockResolvedValue(null);

    await expect(canEditTrip('trip-1', 'stranger')).resolves.toBe(false);
  });

  it('returns false when the trip does not exist', async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

    await expect(canEditTrip('missing-trip', 'user-1')).resolves.toBe(false);
  });
});
