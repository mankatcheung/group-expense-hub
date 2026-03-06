import { Resend } from "resend";
import prisma from "../../prisma/client";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async (
  email: string,
  tripName: string,
  inviterName: string,
  token: string
) => {
  const joinUrl = `http://localhost:3000/join?token=${token}`;

  await getResend().emails.send({
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

export type TripAccessLevel = "owner" | "collaborator" | null;

export const getTripAccessLevel = async (
  tripId: string,
  userId: string
): Promise<TripAccessLevel> => {
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

export const canAccessTrip = async (tripId: string, userId: string) => {
  const access = await getTripAccessLevel(tripId, userId);
  return access !== null;
};

export const canEditTrip = async (tripId: string, userId: string) => {
  const access = await getTripAccessLevel(tripId, userId);
  return access === "owner" || access === "collaborator";
};
