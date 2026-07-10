import type { IEmailService, SendPasswordResetEmailInput, SendTripInvitationEmailInput, SendTripAddedNotificationInput } from '../../application/ports/services/email.service.js';

function escapeHtml(str: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c] || c);
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

async function sendEmail(apiKey: string, sender: { email: string; name: string }, to: string, subject: string, html: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

export function createBrevoEmailService(): IEmailService {
  const apiKey = process.env.BREVO_API_KEY;
  const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:4040';
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@group-expense-hub.com',
    name: process.env.BREVO_SENDER_NAME || 'Group Expense Hub',
  };

  return {
    getAppUrl() {
      return appUrl;
    },

    async sendPasswordResetEmail({ to, name, resetUrl }: SendPasswordResetEmailInput) {
      const safe = sanitizeUrl(resetUrl);
      if (!safe) throw new Error('Invalid reset URL');
      if (!apiKey) { console.warn('BREVO_API_KEY not set, skipping email send'); return; }
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#2563eb">Reset Your Password</h2>
<p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p>
<p>You requested to reset your password. Click below to create a new password:</p>
<div style="text-align:center;margin:30px 0"><a href="${safe}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Reset Password</a></div>
<p>This link will expire in 1 hour.</p>
</body></html>`;
      await sendEmail(apiKey, sender, to, 'Reset Your Password', html);
    },

    async sendTripInvitationEmail({ to, inviterName, tripName, inviteUrl }: SendTripInvitationEmailInput) {
      const safe = sanitizeUrl(inviteUrl);
      if (!safe) throw new Error('Invalid invitation URL');
      if (!apiKey) { console.warn('BREVO_API_KEY not set, skipping email send'); return; }
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#2563eb">You've Been Invited!</h2>
<p>${escapeHtml(inviterName)} has invited you to join "${escapeHtml(tripName)}" on Group Expense Hub.</p>
<div style="text-align:center;margin:30px 0"><a href="${safe}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Join Trip</a></div>
<p>This invitation will expire in 1 week.</p>
</body></html>`;
      await sendEmail(apiKey, sender, to, `You've been invited to join "${escapeHtml(tripName)}"`, html);
    },

    async sendTripAddedNotification({ to, name, inviterName, tripName, tripUrl }: SendTripAddedNotificationInput) {
      const safe = sanitizeUrl(tripUrl);
      if (!safe) throw new Error('Invalid trip URL');
      if (!apiKey) { console.warn('BREVO_API_KEY not set, skipping email send'); return; }
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#2563eb">You've Been Added to a Trip!</h2>
<p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p>
<p>${escapeHtml(inviterName)} has added you to "${escapeHtml(tripName)}" on Group Expense Hub.</p>
<div style="text-align:center;margin:30px 0"><a href="${safe}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">View Trip</a></div>
</body></html>`;
      await sendEmail(apiKey, sender, to, `You've been added to "${escapeHtml(tripName)}"`, html);
    },
  };
}
