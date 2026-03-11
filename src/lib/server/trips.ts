'use server';

import {
  PrismaClient,
  Trip as PrismaTrip,
  Member as PrismaMember,
  Expense as PrismaExpense,
  TripMember as PrismaTripMember,
} from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { rateLimit } from '@/lib/ratelimit';
import { INVITATION } from '@/lib/constants';

const createPrismaClient = () => {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL || 'file:./dev.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
};

let prisma: PrismaClient;

const getPrisma = () => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { sendTripInvitationEmail, sendTripAddedNotification, getAppUrl } from '@/lib/email';

async function getSession() {
  const cookieStore = await cookies();

  // Check for secure cookie first (production/HTTPS), then fall back to regular cookie (development)
  const sessionToken =
    cookieStore.get('__Secure-better-auth.session_token') ||
    cookieStore.get('better-auth.session_token');

  if (!sessionToken) {
    throw new Error('Unauthorized');
  }

  const cookieName = sessionToken.name.startsWith('__Secure-')
    ? '__Secure-better-auth.session_token'
    : 'better-auth.session_token';

  const session = await auth.api.getSession({
    headers: {
      cookie: `${cookieName}=${sessionToken.value}`,
    },
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

export type TripAccessLevel = 'owner' | 'collaborator' | null;

async function getTripAccessLevel(tripId: string, userId: string): Promise<TripAccessLevel> {
  const trip = await getPrisma().trip.findUnique({
    where: { id: tripId },
    select: { userId: true },
  });

  if (!trip) return null;

  if (trip.userId === userId) return 'owner';

  const member = await getPrisma().tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId,
      },
    },
  });

  return member ? 'collaborator' : null;
}

async function canAccessTrip(tripId: string, userId: string) {
  const access = await getTripAccessLevel(tripId, userId);
  return access !== null;
}

async function canEditTrip(tripId: string, userId: string) {
  const access = await getTripAccessLevel(tripId, userId);
  return access === 'owner' || access === 'collaborator';
}

interface FormattedMember {
  id: string;
  name: string;
  color: string;
}

interface FormattedTripMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface FormattedExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
  splitAmong: string[];
}

function formatTrip(
  trip: PrismaTrip & {
    user?: { id: string; name: string | null; email: string; image: string | null } | null;
    members: PrismaMember[];
    tripMembers: (PrismaTripMember & {
      user: { id: string; name: string | null; email: string; image: string | null };
    })[];
    expenses: (PrismaExpense & { paidById: string; splits: { memberId: string }[] })[];
  },
  userId: string
): {
  id: string;
  name: string;
  createdAt: string;
  isOwner: boolean;
  owner: { id: string; name: string | null; email: string; image: string | null } | null;
  members: FormattedMember[];
  tripMembers: FormattedTripMember[];
  expenses: FormattedExpense[];
} {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt.toISOString(),
    isOwner: trip.userId === userId,
    owner: trip.user
      ? {
          id: trip.user.id,
          name: trip.user.name,
          email: trip.user.email,
          image: trip.user.image,
        }
      : null,
    members: trip.members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
    })),
    tripMembers: trip.tripMembers.map((tm) => ({
      id: tm.id,
      userId: tm.userId,
      role: tm.role,
      user: {
        id: tm.user.id,
        name: tm.user.name,
        email: tm.user.email,
        image: tm.user.image,
      },
    })),
    expenses: trip.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date.toISOString(),
      paidBy: e.paidById,
      splitAmong: e.splits.map((s) => s.memberId),
    })),
  };
}

export async function getTrips() {
  const session = await getSession();
  const userId = session.user.id;

  const ownedTrips = await getPrisma().trip.findMany({
    where: {
      userId,
    },
    include: {
      members: true,
      expenses: {
        include: {
          splits: true,
        },
      },
      tripMembers: {
        include: {
          user: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const collaboratorTripIds = await getPrisma().tripMember.findMany({
    where: { userId },
    select: { tripId: true },
  });

  const collaboratorTrips = await getPrisma().trip.findMany({
    where: {
      id: { in: collaboratorTripIds.map((t) => t.tripId) },
    },
    include: {
      members: true,
      expenses: {
        include: {
          splits: true,
        },
      },
      tripMembers: {
        include: {
          user: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const trips = [...ownedTrips, ...collaboratorTrips];
  return trips.map((trip) => formatTrip(trip, userId));
}

export async function getTrip(id: string) {
  const session = await getSession();
  const userId = session.user.id;

  const hasAccess = await canAccessTrip(id, userId);
  if (!hasAccess) {
    throw new Error('Trip not found');
  }

  const trip = await getPrisma().trip.findUnique({
    where: { id },
    include: {
      members: true,
      expenses: {
        include: {
          splits: true,
        },
      },
      tripMembers: {
        include: {
          user: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  return formatTrip(trip, userId);
}

export async function createTrip(data: { id: string; name: string; createdAt?: string }) {
  const session = await getSession();

  const trip = await getPrisma().trip.create({
    data: {
      id: data.id,
      name: data.name,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      userId: session.user.id,
    },
  });

  revalidatePath('/');
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
}

export async function deleteTrip(id: string) {
  const session = await getSession();

  await getPrisma().trip.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath('/');
  return { success: true };
}

export async function updateTrip(id: string, data: { name: string }) {
  const session = await getSession();

  const canEdit = await canEditTrip(id, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  const trip = await getPrisma().trip.update({
    where: { id },
    data: { name: data.name },
  });

  revalidatePath('/');
  revalidatePath(`/trip/${id}`);
  return trip;
}

export async function addMember(tripId: string, data: { id: string; name: string; color: string }) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  const member = await getPrisma().member.create({
    data: {
      id: data.id,
      name: data.name,
      color: data.color,
      tripId,
    },
  });

  revalidatePath(`/trip/${tripId}`);
  return member;
}

export async function updateMember(tripId: string, memberId: string, data: { name: string }) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  const member = await getPrisma().member.update({
    where: { id: memberId },
    data: { name: data.name },
  });

  revalidatePath(`/trip/${tripId}`);
  return member;
}

export async function removeMember(tripId: string, memberId: string, force: boolean = false) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  const member = await getPrisma().member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  const expenseCount = await getPrisma().expense.count({
    where: {
      tripId,
      OR: [{ paidById: memberId }, { splits: { some: { memberId } } }],
    },
  });

  if (expenseCount > 0 && !force) {
    return {
      error: 'Member has expenses',
      expenseCount,
      memberName: member.name,
    };
  }

  if (expenseCount > 0 && force) {
    await getPrisma().$transaction([
      getPrisma().expenseSplit.deleteMany({
        where: { memberId },
      }),
      getPrisma().expense.deleteMany({
        where: {
          tripId,
          OR: [{ paidById: memberId }, { splits: { some: { memberId } } }],
        },
      }),
      getPrisma().member.delete({
        where: { id: memberId },
      }),
    ]);
  } else {
    await getPrisma().member.delete({
      where: { id: memberId },
    });
  }

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

export async function addExpense(
  tripId: string,
  data: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitAmong: string[];
    date?: string;
  }
) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  await getPrisma().expense.create({
    data: {
      id: data.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: data.date ? new Date(data.date) : undefined,
      tripId,
      paidById: data.paidBy,
      splits: {
        create: data.splitAmong.map((memberId) => ({
          memberId,
        })),
      },
    },
  });

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitAmong: string[];
    date?: string;
  }
) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  await getPrisma().expense.update({
    where: { id: expenseId },
    data: {
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: data.date ? new Date(data.date) : undefined,
      tripId,
      paidById: data.paidBy,
      splits: {
        deleteMany: {},
        create: data.splitAmong.map((memberId) => ({
          memberId,
        })),
      },
    },
  });

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

export async function removeExpense(tripId: string, expenseId: string) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error('Not authorized to edit this trip');
  }

  await getPrisma().expense.delete({
    where: { id: expenseId },
  });

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

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

export async function inviteMember(tripId: string, email: string) {
  const session = await getSession();

  const rateLimitResult = await rateLimit.email.limit(session.user.id);
  if (!rateLimitResult.success) {
    throw new Error('Too many requests. Please try again later.');
  }

  const access = await getTripAccessLevel(tripId, session.user.id);
  if (access !== 'owner') {
    throw new Error('Only the owner can invite members');
  }

  const trip = await getPrisma().trip.findUnique({
    where: { id: tripId },
    select: { name: true, user: { select: { name: true, email: true } } },
  });

  if (!trip) {
    throw new Error('Trip not found');
  }

  const inviterName = trip.user?.name || trip.user?.email || 'Someone';

  const user = await getPrisma().user.findUnique({
    where: { email },
  });

  if (!user) {
    const existingInvitation = await getPrisma().tripInvitation.findUnique({
      where: {
        tripId_email: {
          tripId,
          email,
        },
      },
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return {
        success: true,
        message: 'Invitation already sent',
        pending: true,
      };
    }

    const token = crypto.randomUUID();

    await getPrisma().tripInvitation.upsert({
      where: {
        tripId_email: {
          tripId,
          email,
        },
      },
      update: {
        expiresAt: new Date(Date.now() + INVITATION.EXPIRES_IN),
        status: 'pending',
        token,
      },
      create: {
        tripId,
        email,
        expiresAt: new Date(Date.now() + INVITATION.EXPIRES_IN),
        token,
      },
    });

    const inviteUrl = `${getAppUrl()}/join/${token}`;
    await sendTripInvitationEmail({
      to: email,
      inviterName,
      tripName: trip.name,
      inviteUrl,
    });

    return {
      success: true,
      message: 'Invitation sent to ' + email,
      pending: true,
    };
  }

  const existingMember = await getPrisma().tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    throw new Error('User is already a member');
  }

  if (user.id === session.user.id) {
    throw new Error('Cannot invite yourself');
  }

  const [tripMember, member] = await getPrisma().$transaction([
    getPrisma().tripMember.create({
      data: {
        tripId,
        userId: user.id,
        role: 'collaborator',
      },
    }),
    getPrisma().member.create({
      data: {
        id: crypto.randomUUID(),
        name: user.name ?? user.email.split('@')[0] ?? 'User',
        color: getRandomColor(),
        tripId,
      },
    }),
  ]);

  await sendTripAddedNotification({
    to: user.email,
    name: user.name,
    inviterName,
    tripName: trip.name,
    tripUrl: `${getAppUrl()}/trip/${tripId}`,
  });

  revalidatePath(`/trip/${tripId}`);
  return {
    success: true,
    message: 'User added to trip',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    member: {
      id: member.id,
      name: member.name,
      color: member.color,
    },
  };
}

export async function removeCollaborator(tripId: string, memberId: string) {
  const session = await getSession();

  const access = await getTripAccessLevel(tripId, session.user.id);
  if (access !== 'owner') {
    throw new Error('Only the owner can remove members');
  }

  const tripMember = await getPrisma().tripMember.findUnique({
    where: { id: memberId },
    select: { user: { select: { name: true, email: true } } },
  });

  if (!tripMember) {
    throw new Error('Member not found');
  }

  await getPrisma().$transaction([
    getPrisma().tripMember.delete({
      where: { id: memberId },
    }),
    getPrisma().member.deleteMany({
      where: {
        tripId,
        name: tripMember.user.name || tripMember.user.email.split('@')[0],
      },
    }),
  ]);

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

export async function joinTrip(token: string) {
  const session = await getSession();
  const userId = session.user.id;

  const invitation = await getPrisma().tripInvitation.findUnique({
    where: { token },
    select: { id: true, tripId: true, status: true, expiresAt: true, role: true },
  });

  if (!invitation) {
    throw new Error('Invalid invitation');
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation expired');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation already used');
  }

  const existingMember = await getPrisma().tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId: invitation.tripId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new Error('Already a member');
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const tripMembers = await getPrisma().member.findMany({
    where: { tripId: invitation.tripId },
    select: { name: true },
  });

  const existingNames = new Set(tripMembers.map((m) => m.name.toLowerCase()));
  const emailPrefix = user?.email?.split('@')[0] ?? 'User';
  const proposedName = user?.name ?? emailPrefix;
  const memberName = existingNames.has(proposedName.toLowerCase()) ? emailPrefix : proposedName;

  await getPrisma().$transaction([
    getPrisma().tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId,
        role: invitation.role || 'collaborator',
      },
    }),
    getPrisma().member.create({
      data: {
        id: crypto.randomUUID(),
        name: memberName,
        color: getRandomColor(),
        tripId: invitation.tripId,
      },
    }),
    getPrisma().tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    }),
  ]);

  revalidatePath('/');
  return { success: true, tripId: invitation.tripId };
}

export async function getInvitations() {
  const session = await getSession();

  const invitations = await getPrisma().tripInvitation.findMany({
    where: {
      email: session.user.email,
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

  return invitations.map((inv) => ({
    id: inv.id,
    token: inv.token,
    tripId: inv.tripId,
    tripName: inv.trip.name,
    inviter: inv.trip.user,
    createdAt: inv.createdAt.toISOString(),
  }));
}

export async function acceptInvitation(id: string) {
  const session = await getSession();
  const userId = session.user.id;

  const invitation = await getPrisma().tripInvitation.findUnique({
    where: { id },
    select: { id: true, tripId: true, email: true, role: true, expiresAt: true, status: true },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.email !== session.user.email) {
    throw new Error('This invitation is not for you');
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation expired');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation already used');
  }

  const existingMember = await getPrisma().tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId: invitation.tripId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new Error('Already a member');
  }

  await getPrisma().$transaction([
    getPrisma().tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId,
        role: invitation.role || 'collaborator',
      },
    }),
    getPrisma().member.create({
      data: {
        id: crypto.randomUUID(),
        name: session.user.name ?? session.user.email.split('@')[0] ?? 'User',
        color: getRandomColor(),
        tripId: invitation.tripId,
      },
    }),
    getPrisma().tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    }),
  ]);

  revalidatePath('/');
  return { success: true, tripId: invitation.tripId };
}

export async function updateUserProfile(data: { name?: string; email?: string }) {
  const session = await getSession();
  const userId = session.user.id;

  const rateLimitResult = await rateLimit.auth.limit(userId);
  if (!rateLimitResult.success) {
    throw new Error('Too many requests. Please try again later.');
  }

  if (data.name) {
    await getPrisma().user.update({
      where: { id: userId },
      data: { name: data.name },
    });
  }

  if (data.email && data.email !== session.user.email) {
    const existingUser = await getPrisma().user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }

    await getPrisma().user.update({
      where: { id: userId },
      data: { email: data.email },
    });
  }

  revalidatePath('/');
  return { success: true };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getSession();

  const rateLimitResult = await rateLimit.auth.limit(session.user.id);
  if (!rateLimitResult.success) {
    throw new Error('Too many requests. Please try again later.');
  }

  await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
    },
    headers: (await cookies()) as any,
  });

  return { success: true };
}
