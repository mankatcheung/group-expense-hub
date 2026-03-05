import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "../prisma/client";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";

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
  const getSession = await auth.api.getSession({
    headers: req.headers,
  });

  if (!getSession) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = getSession.user;
  next();
};

app.get("/api/auth/me", authenticate, async (req: any, res: any) => {
  res.json({ user: req.user });
});

app.get("/api/trips", authenticate, async (req: any, res: any) => {
  try {
    const trips = await prisma.trip.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedTrips = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt.toISOString(),
      members: trip.members.map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
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
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        members: true,
        expenses: {
          include: {
            splits: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const formattedTrip = {
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt.toISOString(),
      members: trip.members.map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
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

app.post("/api/trips", authenticate, async (req: any, res: any) => {
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
});

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

app.post("/api/trips/:id/members", authenticate, async (req: any, res: any) => {
  try {
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
});

app.delete(
  "/api/trips/:tripId/members/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
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
  async (req: any, res: any) => {
    try {
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
  async (req: any, res: any) => {
    try {
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
