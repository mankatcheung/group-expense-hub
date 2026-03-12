const BREVO_API_KEY = process.env.BREVO_API_KEY;
const APP_URL = process.env.BETTER_AUTH_URL || 'http://localhost:4040';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@group-expense-hub.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Group Expense Hub';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set, skipping email send');
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
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
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

export function getAppUrl() {
  return APP_URL;
}

const passwordResetTemplate = ({ name, resetUrl }: { name: string | null; resetUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Reset Your Password</h2>
    <p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p>
    <p>You requested to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">Group Expense Hub</p>
  </body>
</html>
`;

const passwordResetSubject = 'Reset Your Password';

const tripInvitationTemplate = ({
  inviterName,
  tripName,
  inviteUrl,
}: {
  inviterName: string;
  tripName: string;
  inviteUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trip Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">You've Been Invited!</h2>
    <p>${escapeHtml(inviterName)} has invited you to join "${escapeHtml(tripName)}" on Group Expense Hub.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Trip</a>
    </div>
    <p>This invitation will expire in 1 week.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">Group Expense Hub</p>
  </body>
</html>
`;

const tripInvitationSubject = (tripName: string) => `You've been invited to join "${tripName}"`;

const tripAddedTemplate = ({
  name,
  inviterName,
  tripName,
  tripUrl,
}: {
  name: string | null;
  inviterName: string;
  tripName: string;
  tripUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Added to Trip</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">You've Been Added to a Trip!</h2>
    <p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p>
    <p>${escapeHtml(inviterName)} has added you to "${escapeHtml(tripName)}" on Group Expense Hub.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${tripUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Trip</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">Group Expense Hub</p>
  </body>
</html>
`;

const tripAddedSubject = (tripName: string) => `You've been added to "${tripName}"`;

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string | null;
  resetUrl: string;
}) {
  const sanitizedResetUrl = sanitizeUrl(resetUrl);
  if (!sanitizedResetUrl) {
    throw new Error('Invalid reset URL');
  }

  const html = passwordResetTemplate({
    name: name ? escapeHtml(name) : null,
    resetUrl: sanitizedResetUrl,
  });

  await sendEmail({
    to,
    subject: passwordResetSubject,
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
  const sanitizedInviteUrl = sanitizeUrl(inviteUrl);
  if (!sanitizedInviteUrl) {
    throw new Error('Invalid invitation URL');
  }

  const html = tripInvitationTemplate({
    inviterName: escapeHtml(inviterName),
    tripName: escapeHtml(tripName),
    inviteUrl: sanitizedInviteUrl,
  });

  await sendEmail({
    to,
    subject: tripInvitationSubject(escapeHtml(tripName)),
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
  const sanitizedTripUrl = sanitizeUrl(tripUrl);
  if (!sanitizedTripUrl) {
    throw new Error('Invalid trip URL');
  }

  const html = tripAddedTemplate({
    name: name ? escapeHtml(name) : null,
    inviterName: escapeHtml(inviterName),
    tripName: escapeHtml(tripName),
    tripUrl: sanitizedTripUrl,
  });

  await sendEmail({
    to,
    subject: tripAddedSubject(escapeHtml(tripName)),
    html,
  });
}
