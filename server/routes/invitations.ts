import { Router } from "express";
import prisma from "../../prisma/client";
import { authenticate } from "../middleware/auth";
import { canEditTrip, sendInvitationEmail } from "../lib/trip";
import { emailBody, joinBody } from "../lib/schemas";
import { validate } from "../middleware/validation";

const router = Router();

router.get("/", authenticate, async (req: any, res: any) => {
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

router.post(
  "/:id/accept",
  authenticate,
  async (req: any, res: any) => {
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
      const randomColor =
        colors[Math.floor(Math.random() * colors.length)];

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
            name:
              req.user.name || req.user.email.split("@")[0],
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
  }
);

export default router;
