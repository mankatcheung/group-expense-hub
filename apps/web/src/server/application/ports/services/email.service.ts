export interface SendPasswordResetEmailInput {
  to: string;
  name?: string | null;
  resetUrl: string;
}

export interface SendTripInvitationEmailInput {
  to: string;
  inviterName: string;
  tripName: string;
  inviteUrl: string;
}

export interface SendTripAddedNotificationInput {
  to: string;
  name?: string | null;
  inviterName: string;
  tripName: string;
  tripUrl: string;
}

export interface IEmailService {
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
  sendTripInvitationEmail(input: SendTripInvitationEmailInput): Promise<void>;
  sendTripAddedNotification(input: SendTripAddedNotificationInput): Promise<void>;
  getAppUrl(): string;
}
