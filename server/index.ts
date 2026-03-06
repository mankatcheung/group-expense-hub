import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { Resend } from "resend";
import prisma from "../prisma/client";
import { auth } from "./auth";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendInvitationEmail = async (email: string, tripName: string, inviterName: string, token: string) => {
  const joinUrl = `http://localhost:3000/join?token=${token}`;
  
  await resend.emails.send({
    from: "Group Expense Hub <onboarding@resend.dev>",
    to: email,
    subject: `You've been invited to "${tripName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p>${inviterName} has invited you to join their trip "<strong>${tripName}</strong>" on Group Expense Hub.</p>
        <p>Click the button below to join the trip:</p>
        <a href="${joinUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Join Trip</a>
        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      </div>
    `,
  });
};

const app = express();
const port = process.env.PORT || 4040;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser());

app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

const authenticate = async (req: any, res: any, next: any) => {
  try {
    const getSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!getSession) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = getSession.user;
    next();
  } catch (error) {
    // Explicitly catch and log the error to prevent silent hangs
    console.error("Authentication Error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
};

const validate = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.errors });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

const uuidParam = z.string().uuid();
const emailBody = z.object({ email: z.string().email() });
const tripBody = z.object({
  id: uuidParam,
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime().optional(),
});
const memberBody = z.object({
  id: uuidParam,
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
const expenseBody = z.object({
  id: uuidParam,
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidBy: z.string().uuid(),
  splitAmong: z.array(z.string().uuid()).min(1),
  date: z.string().datetime().optional(),
});
const updateExpenseBody = expenseBody.partial({ id: true });
const joinBody = z.object({ token: z.string().uuid() });

const getTripAccessLevel = async (tripId: string, userId: string) => {
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
};

const canAccessTrip = async (tripId: string, userId: string) => {
  const access = await getTripAccessLevel(tripId, userId);
  return access !== null;
};

const canEditTrip = async (tripId: string, userId: string) => {
  const access = await getTripAccessLevel(tripId, userId);
  return access === "owner" || access === "collaborator";
};

app.get("/api/auth/me", authenticate, async (req: any, res: any) => {
  res.json({ user: req.user });
});

app.get("/api/invitations", authenticate, async (req: any, res: any) => {
  try {
    const invitations = await prisma.tripInvitation.findMany({
      where: {
        email: req.user.email,
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

    const formattedInvitations = invitations.map((inv) => ({
      id: inv.id,
      token: inv.token,
      tripId: inv.tripId,
      tripName: inv.trip.name,
      inviter: inv.trip.user,
      createdAt: inv.createdAt.toISOString(),
    }));

    res.json(formattedInvitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

app.post("/api/invitations/:id/accept", authenticate, async (req: any, res: any) => {
  try {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: req.params.id },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invitation.email !== req.user.email) {
      return res.status(403).json({ error: "This invitation is not for you" });
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

    const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];
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
          name: req.user.name || req.user.email.split("@")[0],
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
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

app.get("/api/trips", authenticate, async (req: any, res: any) => {
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

app.get("/api/trips/:id", authenticate, async (req: any, res: any) => {
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

app.post(
  "/api/trips",
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
        expenses: [],
        createdAt: trip.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  },
);

app.delete("/api/trips/:id", authenticate, async (req: any, res: any) => {
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

app.post(
  "/api/trips/:id/members",
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

app.delete(
  "/api/trips/:tripId/members/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
      const canEdit = await canEditTrip(req.params.tripId, req.user.id);
      if (!canEdit) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit this trip" });
      }

      await prisma.member.delete({
        where: { id: req.params.memberId },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

app.post(
  "/api/trips/:id/expenses",
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

app.put(
  "/api/trips/:id/expenses/:expenseId",
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

app.delete(
  "/api/trips/:tripId/expenses/:expenseId",
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

app.get("/api/trips/:id/members", authenticate, async (req: any, res: any) => {
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

app.post(
  "/api/trips/:id/invite",
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

      await prisma.tripMember.create({
        data: {
          tripId: req.params.id,
          userId: user.id,
          role: "collaborator",
        },
      });

      res.json({
        success: true,
        message: "User added to trip",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ error: "Failed to invite member" });
    }
  },
);

app.delete(
  "/api/trips/:id/collaborators/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
      const access = await getTripAccessLevel(req.params.id, req.user.id);
      if (access !== "owner") {
        return res
          .status(403)
          .json({ error: "Only the owner can remove members" });
      }

      await prisma.tripMember.delete({
        where: { id: req.params.memberId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

app.post(
  "/api/trips/join",
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

      const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
