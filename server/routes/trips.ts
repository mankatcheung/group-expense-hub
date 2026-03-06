import { Router } from "express";
import prisma from "../../prisma/client";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import {
  getTripAccessLevel,
  canAccessTrip,
  canEditTrip,
  sendInvitationEmail,
} from "../lib/trip";
import {
  tripBody,
  memberBody,
  expenseBody,
  updateExpenseBody,
  emailBody,
  joinBody,
} from "../lib/schemas";

const router = Router();

router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const ownedTrips = await prisma.trip.findMany({
      where: {
        userId: req.user.id,
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
      where: { userId: req.user.id },
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

    const formattedTrips = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt.toISOString(),
      isOwner: trip.userId === req.user.id,
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
    }));

    res.json(formattedTrips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

router.get("/:id", authenticate, async (req: any, res: any) => {
  try {
    const hasAccess = await canAccessTrip(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
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
      return res.status(404).json({ error: "Trip not found" });
    }

    const isOwner = trip.userId === req.user.id;

    const formattedTrip = {
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt.toISOString(),
      isOwner,
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

    res.json(formattedTrip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ error: "Failed to fetch trip" });
  }
});

router.post(
  "/",
  authenticate,
  validate(tripBody),
  async (req: any, res: any) => {
    try {
      const { id, name, createdAt } = req.body;

      const trip = await prisma.trip.create({
        data: {
          id,
          name,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          userId: req.user.id,
        },
      });

      res.json({
        id: trip.id,
        name: trip.name,
        members: [],
        tripMembers: [],
        expenses: [],
        createdAt: trip.createdAt.toISOString(),
        isOwner: true,
        owner: null,
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  },
);

router.delete("/:id", authenticate, async (req: any, res: any) => {
  try {
    await prisma.trip.delete({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

router.post(
  "/:id/members",
  authenticate,
  validate(memberBody),
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.id, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      const { id, name, color } = req.body;

      const member = await prisma.member.create({
        data: {
          id,
          name,
          color,
          tripId: req.params.id,
        },
      });

      res.json(member);
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  },
);

router.delete(
  "/:tripId/members/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.tripId, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      const member = await prisma.member.findUnique({
        where: { id: req.params.memberId },
      });

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const expensesWithMember = await prisma.expense.findMany({
        where: {
          tripId: req.params.tripId,
          OR: [
            { paidById: req.params.memberId },
            { splits: { some: { memberId: req.params.memberId } } },
          ],
        },
      });

      const hasExpenses = expensesWithMember.length > 0;
      const force = req.query.force === "true";

      if (hasExpenses && !force) {
        return res.status(409).json({
          error: "Member has expenses",
          expenseCount: expensesWithMember.length,
          memberName: member.name,
        });
      }

      if (hasExpenses && force) {
        await prisma.$transaction([
          prisma.expenseSplit.deleteMany({
            where: { memberId: req.params.memberId },
          }),
          prisma.expense.deleteMany({
            where: {
              tripId: req.params.tripId,
              OR: [
                { paidById: req.params.memberId },
                { id: { in: expensesWithMember.map((e) => e.id) } },
              ],
            },
          }),
          prisma.member.delete({
            where: { id: req.params.memberId },
          }),
        ]);
      } else {
        await prisma.member.delete({
          where: { id: req.params.memberId },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

router.post(
  "/:id/expenses",
  authenticate,
  validate(expenseBody),
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.id, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      const { id, description, amount, currency, paidBy, splitAmong, date } =
        req.body;

      const expense = await prisma.expense.create({
        data: {
          id,
          description,
          amount,
          currency,
          date: date ? new Date(date) : undefined,
          tripId: req.params.id,
          paidById: paidBy,
          splits: {
            create: splitAmong.map((memberId: string) => ({
              memberId,
            })),
          },
        },
      });

      res.json({ success: true, id: expense.id });
    } catch (error) {
      console.error("Error adding expense:", error);
      res.status(500).json({ error: "Failed to add expense" });
    }
  },
);

router.put(
  "/:id/expenses/:expenseId",
  authenticate,
  validate(updateExpenseBody),
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.id, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      const { expenseId } = req.params;
      const { description, amount, currency, paidBy, splitAmong, date } =
        req.body;

      const expense = await prisma.expense.update({
        where: {
          id: expenseId,
        },
        data: {
          description,
          amount,
          currency,
          date: date ? new Date(date) : undefined,
          tripId: req.params.id,
          paidById: paidBy,
          splits: {
            deleteMany: {},
            create: splitAmong.map((memberId: string) => ({
              memberId,
            })),
          },
        },
      });

      res.json({ success: true, id: expense.id });
    } catch (error) {
      console.error("Error adding expense:", error);
      res.status(500).json({ error: "Failed to add expense" });
    }
  },
);

router.delete(
  "/:tripId/expenses/:expenseId",
  authenticate,
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.tripId, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      await prisma.expense.delete({
        where: { id: req.params.expenseId },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing expense:", error);
      res.status(500).json({ error: "Failed to remove expense" });
    }
  },
);

router.get("/:id/members", authenticate, async (req: any, res: any) => {
  try {
    const hasAccess = await canAccessTrip(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        tripMembers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const members = [
      {
        id: "owner",
        userId: trip.userId,
        role: "owner",
        user: trip.user,
      },
      ...trip.tripMembers.map((tm) => ({
        id: tm.id,
        userId: tm.userId,
        role: tm.role,
        user: tm.user,
      })),
    ];

    res.json(members);
  } catch (error) {
    console.error("Error fetching trip members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.post(
  "/:id/invite",
  authenticate,
  validate(emailBody),
  async (req: any, res: any) => {
    try {
      const access = await getTripAccessLevel(req.params.id, req.user.id);
      if (access !== "owner") {
        return res
          .status(403)
          .json({ error: "Only the owner can invite members" });
      }

      const { email } = req.body;

      const trip = await prisma.trip.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      const inviterName = trip.user?.name || trip.user?.email || "Someone";

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const existingInvitation = await prisma.tripInvitation.findUnique({
          where: {
            tripId_email: {
              tripId: req.params.id,
              email,
            },
          },
        });

        if (existingInvitation && existingInvitation.expiresAt > new Date()) {
          return res.json({
            success: true,
            message: "Invitation already sent",
            pending: true,
          });
        }

        const token = crypto.randomUUID();

        await prisma.tripInvitation.upsert({
          where: {
            tripId_email: {
              tripId: req.params.id,
              email,
            },
          },
          update: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "pending",
            token,
          },
          create: {
            tripId: req.params.id,
            email,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token,
          },
        });

        await sendInvitationEmail(email, trip.name, inviterName, token);

        return res.json({
          success: true,
          message: "Invitation sent to " + email,
          pending: true,
        });
      }

      const existingMember = await prisma.tripMember.findUnique({
        where: {
          tripId_userId: {
            tripId: req.params.id,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ error: "User is already a member" });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({ error: "Cannot invite yourself" });
      }

      const colors = [
        "#EF4444",
        "#F97316",
        "#EAB308",
        "#22C55E",
        "#14B8A6",
        "#3B82F6",
        "#8B5CF6",
        "#EC4899",
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const [tripMember, member] = await prisma.$transaction([
        prisma.tripMember.create({
          data: {
            tripId: req.params.id,
            userId: user.id,
            role: "collaborator",
          },
        }),
        prisma.member.create({
          data: {
            id: crypto.randomUUID(),
            name: user.name || user.email.split("@")[0],
            color: randomColor,
            tripId: req.params.id,
          },
        }),
      ]);

      res.json({
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
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ error: "Failed to invite member" });
    }
  },
);

router.delete(
  "/:id/collaborators/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
      const access = await getTripAccessLevel(req.params.id, req.user.id);
      if (access !== "owner") {
        return res
          .status(403)
          .json({ error: "Only the owner can remove members" });
      }

      const tripMember = await prisma.tripMember.findUnique({
        where: { id: req.params.memberId },
        include: { user: true },
      });

      if (!tripMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      await prisma.$transaction([
        prisma.tripMember.delete({
          where: { id: req.params.memberId },
        }),
        prisma.member.deleteMany({
          where: {
            tripId: req.params.id,
            name: tripMember.user.name || tripMember.user.email.split("@")[0],
          },
        }),
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

router.post(
  "/join",
  authenticate,
  validate(joinBody),
  async (req: any, res: any) => {
    try {
      const { token } = req.body;

      const invitation = await prisma.tripInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation" });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation already used" });
      }

      const existingMember = await prisma.tripMember.findUnique({
        where: {
          tripId_userId: {
            tripId: invitation.tripId,
            userId: req.user.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ error: "Already a member" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      const colors = [
        "#EF4444",
        "#F97316",
        "#EAB308",
        "#22C55E",
        "#14B8A6",
        "#3B82F6",
        "#8B5CF6",
        "#EC4899",
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      await prisma.$transaction([
        prisma.tripMember.create({
          data: {
            tripId: invitation.tripId,
            userId: req.user.id,
            role: invitation.role || "collaborator",
          },
        }),
        prisma.member.create({
          data: {
            id: crypto.randomUUID(),
            name: user?.name || user?.email.split("@")[0] || "User",
            color: randomColor,
            tripId: invitation.tripId,
          },
        }),
        prisma.tripInvitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        }),
      ]);

      res.json({ success: true, tripId: invitation.tripId });
    } catch (error) {
      console.error("Error joining trip:", error);
      res.status(500).json({ error: "Failed to join trip" });
    }
  },
);

export default router;
