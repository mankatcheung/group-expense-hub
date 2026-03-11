import { baseTemplate } from './base';

export const tripAddedTemplate = ({
  name,
  email,
  inviterName,
  tripName,
  tripUrl,
}: {
  name?: string | null;
  email: string;
  inviterName: string;
  tripName: string;
  tripUrl: string;
}) => {
  return baseTemplate({
    title: "You've been added to a trip!",
    body: `
      <p>Hi ${name || email.split('@')[0]},</p>
      <p><strong>${inviterName}</strong> has added you as a collaborator to their trip "<strong>${tripName}</strong>" on Group Expense Hub.</p>
      <p>You can now view and manage expenses for this trip.</p>
    `,
    cta: 'View Trip',
    ctaUrl: tripUrl,
  });
};

export const tripAddedSubject = (tripName: string) =>
  `You've been added to "${tripName}" - Group Expense Hub`;
