export interface TripMemberWithUser {
  id: string;
  userId: string;
  tripId: string;
  role: string;
  user: { name: string | null; email: string };
}

export interface ITripMemberRepository {
  findIdsByUserId(userId: string): Promise<string[]>;
  findByTripAndUser(tripId: string, userId: string): Promise<{ id: string } | null>;
  findById(id: string): Promise<TripMemberWithUser | null>;
  create(data: { tripId: string; userId: string; role: string }): Promise<{ id: string }>;
  delete(id: string): Promise<void>;
}
