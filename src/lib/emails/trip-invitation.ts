import { baseTemplate } from './base';
import { INVITATION, TIME } from '../constants';

export const tripInvitationTemplate = ({
  inviterName,
  tripName,
  inviteUrl,
}: {
  inviterName: string;
  tripName: string;
  inviteUrl: string;
}) => {
  return baseTemplate({
    title: "You've been invited!",
    body: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join their trip "<strong>${tripName}</strong>" on Group Expense Hub.</p>
      <p>Click the button below to join the trip:</p>
      <p>Or copy and paste this link: ${inviteUrl}</p>
      <p>This invitation expires in ${INVITATION.EXPIRES_IN / TIME.MILLISECONDS.ONE_DAY} days.</p>
    `,
    cta: 'Join Trip',
    ctaUrl: inviteUrl,
  });
};

export const tripInvitationSubject = (tripName: string) =>
  `You've been invited to join "${tripName}" - Group Expense Hub`;
