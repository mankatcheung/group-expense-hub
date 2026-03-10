const BREVO_API_KEY = process.env.BREVO_API_KEY;
const APP_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const SENDER_EMAIL =
  process.env.BREVO_SENDER_EMAIL || "noreply@group-expense-hub.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "Group Expense Hub";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set, skipping email send");
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: SENDER_EMAIL,
        name: SENDER_NAME,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

export function getAppUrl() {
  return APP_URL;
}

export function getEmailTemplate({
  title,
  body,
  cta,
  ctaUrl,
}: {
  title: string;
  body: string;
  cta?: string;
  ctaUrl?: string;
}) {
  const ctaHtml =
    cta && ctaUrl
      ? `
      <a href="${ctaUrl}" style="display: inline-block; background: #16553b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">${cta}</a>
    `
      : "";

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>${title}</h1>
      ${body}
      ${ctaHtml}
      <p style="color: #888; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string | null;
  resetUrl: string;
}) {
  const html = getEmailTemplate({
    title: "Reset Your Password",
    body: `
      <p>Hi ${name || "there"},</p>
      <p>Click the button below to reset your password:</p>
      <p>Or copy and paste this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
    `,
    cta: "Reset Password",
    ctaUrl: resetUrl,
  });

  await sendEmail({
    to,
    subject: "Reset Your Password - Group Expense Hub",
    html,
  });
}

export async function sendTripInvitationEmail({
  to,
  inviterName,
  tripName,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  tripName: string;
  inviteUrl: string;
}) {
  const html = getEmailTemplate({
    title: "You've been invited!",
    body: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join their trip "<strong>${tripName}</strong>" on Group Expense Hub.</p>
      <p>Click the button below to join the trip:</p>
      <p>Or copy and paste this link: ${inviteUrl}</p>
      <p>This invitation expires in 7 days.</p>
    `,
    cta: "Join Trip",
    ctaUrl: inviteUrl,
  });

  await sendEmail({
    to,
    subject: `You've been invited to join "${tripName}" - Group Expense Hub`,
    html,
  });
}

export async function sendTripAddedNotification({
  to,
  name,
  inviterName,
  tripName,
  tripUrl,
}: {
  to: string;
  name?: string | null;
  inviterName: string;
  tripName: string;
  tripUrl: string;
}) {
  const html = getEmailTemplate({
    title: "You've been added to a trip!",
    body: `
      <p>Hi ${name || to.split("@")[0]},</p>
      <p><strong>${inviterName}</strong> has added you as a collaborator to their trip "<strong>${tripName}</strong>" on Group Expense Hub.</p>
      <p>You can now view and manage expenses for this trip.</p>
    `,
    cta: "View Trip",
    ctaUrl: tripUrl,
  });

  await sendEmail({
    to,
    subject: `You've been added to "${tripName}" - Group Expense Hub`,
    html,
  });
}
