"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("better-auth.session_token");
  
  if (!sessionToken) {
    throw new Error("Unauthorized");
  }

  const session = await auth.api.getSession({
    headers: {
      cookie: `better-auth.session_token=${sessionToken.value}`,
    },
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export type TripAccessLevel = "owner" | "collaborator" | null;

async function getTripAccessLevel(tripId: string, userId: string): Promise<TripAccessLevel> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { userId: true },
  });

  if (!trip) return null;

  if (trip.userId === userId) return "owner";

  const member = await prisma.tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId,
      },
    },
  });

  return member ? "collaborator" : null;
}

async function canAccessTrip(tripId: string, userId: string) {
  const access = await getTripAccessLevel(tripId, userId);
  return access !== null;
}

async function canEditTrip(tripId: string, userId: string) {
  const access = await getTripAccessLevel(tripId, userId);
  return access === "owner" || access === "collaborator";
}

function formatTrip(trip: any, userId: string) {
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
    members: trip.members.map((m: any) => ({
      id: m.id,
      name: m.name,
      color: m.color,
    })),
    tripMembers: trip.tripMembers.map((tm: any) => ({
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
    expenses: trip.expenses.map((e: any) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date.toISOString(),
      paidBy: e.paidById,
      splitAmong: e.splits.map((s: any) => s.memberId),
    })),
  };
}

export async function getTrips() {
  const session = await getSession();
  const userId = session.user.id;

  const ownedTrips = await prisma.trip.findMany({
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
      createdAt: "desc",
    },
  });

  const collaboratorTripIds = await prisma.tripMember.findMany({
    where: { userId },
    select: { tripId: true },
  });

  const collaboratorTrips = await prisma.trip.findMany({
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
      createdAt: "desc",
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
    throw new Error("Trip not found");
  }

  const trip = await prisma.trip.findUnique({
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
    throw new Error("Trip not found");
  }

  return formatTrip(trip, userId);
}

export async function createTrip(data: { id: string; name: string; createdAt?: string }) {
  const session = await getSession();

  const trip = await prisma.trip.create({
    data: {
      id: data.id,
      name: data.name,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
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

  await prisma.trip.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
  return { success: true };
}

export async function addMember(tripId: string, data: { id: string; name: string; color: string }) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error("Not authorized to edit this trip");
  }

  const member = await prisma.member.create({
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

export async function removeMember(tripId: string, memberId: string, force: boolean = false) {
  const session = await getSession();

  const canEdit = await canEditTrip(tripId, session.user.id);
  if (!canEdit) {
    throw new Error("Not authorized to edit this trip");
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const expensesWithMember = await prisma.expense.findMany({
    where: {
      tripId,
      OR: [
        { paidById: memberId },
        { splits: { some: { memberId } } },
      ],
    },
  });

  const hasExpenses = expensesWithMember.length > 0;

  if (hasExpenses && !force) {
    return {
      error: "Member has expenses",
      expenseCount: expensesWithMember.length,
      memberName: member.name,
    };
  }

  if (hasExpenses && force) {
    await prisma.$transaction([
      prisma.expenseSplit.deleteMany({
        where: { memberId },
      }),
      prisma.expense.deleteMany({
        where: {
          tripId,
          OR: [
            { paidById: memberId },
            { id: { in: expensesWithMember.map((e) => e.id) } },
          ],
        },
      }),
      prisma.member.delete({
        where: { id: memberId },
      }),
    ]);
  } else {
    await prisma.member.delete({
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
    throw new Error("Not authorized to edit this trip");
  }

  await prisma.expense.create({
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
    throw new Error("Not authorized to edit this trip");
  }

  await prisma.expense.update({
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
    throw new Error("Not authorized to edit this trip");
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

const COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export async function inviteMember(tripId: string, email: string) {
  const session = await getSession();

  const access = await getTripAccessLevel(tripId, session.user.id);
  if (access !== "owner") {
    throw new Error("Only the owner can invite members");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { user: true },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const inviterName = trip.user?.name || trip.user?.email || "Someone";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const existingInvitation = await prisma.tripInvitation.findUnique({
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
        message: "Invitation already sent",
        pending: true,
      };
    }

    const token = crypto.randomUUID();

    await prisma.tripInvitation.upsert({
      where: {
        tripId_email: {
          tripId,
          email,
        },
      },
      update: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "pending",
        token,
      },
      create: {
        tripId,
        email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        token,
      },
    });

    return {
      success: true,
      message: "Invitation sent to " + email,
      pending: true,
    };
  }

  const existingMember = await prisma.tripMember.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    throw new Error("User is already a member");
  }

  if (user.id === session.user.id) {
    throw new Error("Cannot invite yourself");
  }

  const [tripMember, member] = await prisma.$transaction([
    prisma.tripMember.create({
      data: {
        tripId,
        userId: user.id,
        role: "collaborator",
      },
    }),
    prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        name: user.name || user.email.split("@")[0],
        color: getRandomColor(),
        tripId,
      },
    }),
  ]);

  revalidatePath(`/trip/${tripId}`);
  return {
    success: true,
    message: "User added to trip",
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
  if (access !== "owner") {
    throw new Error("Only the owner can remove members");
  }

  const tripMember = await prisma.tripMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!tripMember) {
    throw new Error("Member not found");
  }

  await prisma.$transaction([
    prisma.tripMember.delete({
      where: { id: memberId },
    }),
    prisma.member.deleteMany({
      where: {
        tripId,
        name: tripMember.user.name || tripMember.user.email.split("@")[0],
      },
    }),
  ]);

  revalidatePath(`/trip/${tripId}`);
  return { success: true };
}

export async function joinTrip(token: string) {
  const session = await getSession();
  const userId = session.user.id;

  const invitation = await prisma.tripInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invalid invitation");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation expired");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation already used");
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
    throw new Error("Already a member");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  await prisma.$transaction([
    prisma.tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId,
        role: invitation.role || "collaborator",
      },
    }),
    prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        name: user?.name || user?.email.split("@")[0] || "User",
        color: getRandomColor(),
        tripId: invitation.tripId,
      },
    }),
    prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    }),
  ]);

  revalidatePath("/");
  return { success: true, tripId: invitation.tripId };
}

export async function getInvitations() {
  const session = await getSession();

  const invitations = await prisma.tripInvitation.findMany({
    where: {
      email: session.user.email,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    include: {
      trip: {
        include: {
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

  const invitation = await prisma.tripInvitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.email !== session.user.email) {
    throw new Error("This invitation is not for you");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation expired");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation already used");
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
    throw new Error("Already a member");
  }

  await prisma.$transaction([
    prisma.tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId,
        role: invitation.role || "collaborator",
      },
    }),
    prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        name: session.user.name || session.user.email.split("@")[0],
        color: getRandomColor(),
        tripId: invitation.tripId,
      },
    }),
    prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    }),
  ]);

  revalidatePath("/");
  return { success: true, tripId: invitation.tripId };
}
