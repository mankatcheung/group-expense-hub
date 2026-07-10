export type TripAccessLevel = 'owner' | 'collaborator' | null;

export interface ITripAccessService {
  getAccessLevel(tripId: string, userId: string): Promise<TripAccessLevel>;
  canEdit(tripId: string, userId: string): Promise<boolean>;
  isOwner(tripId: string, userId: string): Promise<boolean>;
}
