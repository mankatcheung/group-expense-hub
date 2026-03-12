import {
  passwordResetTemplate,
  passwordResetSubject,
  tripInvitationTemplate,
  tripInvitationSubject,
  tripAddedTemplate,
  tripAddedSubject,
} from './emails';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const APP_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
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
    email: to,
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
