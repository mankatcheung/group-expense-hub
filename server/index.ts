import express from "express";
import cors from "cors";
import prisma from "../prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "secret_fallback_123";

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// --- ROUTES ---

// Auth Register
app.post("/api/auth/register", async (req: any, res: any) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Auth Login
app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Auth Me
app.get("/api/auth/me", authenticate, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET all trips
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

    // Format for frontend
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

// GET single trip
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

// CREATE trip
app.post("/api/trips", authenticate, async (req: any, res: any) => {
  try {
    const { id, name, createdAt } = req.body;

    const trip = await prisma.trip.create({
      data: {
        id, // We allow setting ID to keep frontend logic same
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

// DELETE trip
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

// ADD member
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

// REMOVE member
app.delete(
  "/api/trips/:tripId/members/:memberId",
  authenticate,
  async (req: any, res: any) => {
    try {
      // Member deletion is cascading to expenses/splits they own/part of
      // However, Prisma SQLite adapter doesn't perfectly emulate all CASCADE constraints seamlessly sometimes,
      // but schema specifies onDelete: Cascade. Let's rely on it.
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

// ADD expense
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

// UPDATE expense
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
// REMOVE expense
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

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
