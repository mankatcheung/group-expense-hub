export interface PendingInvitation {
  id: string;
  token: string;
  tripId: string;
  createdAt: Date;
  trip: {
    name: string;
    user: { id: string; name: string | null; email: string; image: string | null } | null;
  };
}

export interface InvitationDetails {
  id: string;
  tripId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
}

export interface IInvitationRepository {
  findPendingByEmail(email: string): Promise<PendingInvitation[]>;
  findById(id: string): Promise<InvitationDetails | null>;
  findByToken(token: string): Promise<{ id: string; tripId: string; status: string; expiresAt: Date; role: string } | null>;
  findByTripAndEmail(tripId: string, email: string): Promise<{ id: string; expiresAt: Date; status: string } | null>;
  upsert(tripId: string, email: string, token: string, expiresAt: Date): Promise<void>;
  markAccepted(id: string): Promise<void>;
}
