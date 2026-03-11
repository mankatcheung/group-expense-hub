import { baseTemplate } from './base';

export const passwordResetTemplate = ({
  name,
  resetUrl,
}: {
  name?: string | null;
  resetUrl: string;
}) => {
  return baseTemplate({
    title: 'Reset Your Password',
    body: `
      <p>Hi ${name || 'there'},</p>
      <p>Click the button below to reset your password:</p>
      <p>Or copy and paste this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
    `,
    cta: 'Reset Password',
    ctaUrl: resetUrl,
  });
};

export const passwordResetSubject = 'Reset Your Password - Group Expense Hub';
