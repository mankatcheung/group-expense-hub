export interface Invitation {
  id: string;
  tripId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
}

export function isExpired(invitation: Pick<Invitation, 'expiresAt'>): boolean {
  return invitation.expiresAt < new Date();
}

export function isPending(invitation: Pick<Invitation, 'status'>): boolean {
  return invitation.status === 'pending';
}
