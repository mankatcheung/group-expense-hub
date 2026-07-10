export interface Trip {
  id: string;
  name: string;
  createdAt: Date;
  ownerId: string | null;
}
