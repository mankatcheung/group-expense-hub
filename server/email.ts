import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const data = await resend.emails.send({
      from: "Group Expense Hub <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    console.log("Email sent:", data);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendVerificationEmail = async ({
  user,
  url,
}: {
  user: { email: string; name?: string | null };
  url: string;
}) => {
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: `
      <h1>Verify your email</h1>
      <p>Hi ${user.name || "there"},</p>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}">${url}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
};

export const sendResetPasswordEmail = async ({
  user,
  url,
}: {
  user: { email: string; name?: string | null };
  url: string;
}) => {
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `
      <h1>Reset your password</h1>
      <p>Hi ${user.name || "there"},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${url}">${url}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `,
  });
};
