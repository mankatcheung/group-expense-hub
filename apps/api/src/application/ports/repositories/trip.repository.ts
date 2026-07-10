import type { Prisma } from '@prisma/client';

export const tripInclude = {
  members: true,
  expenses: { include: { splits: true } },
  tripMembers: { include: { user: true } },
  user: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.TripInclude;

export const tripSummarySelect = {
  id: true,
  name: true,
  createdAt: true,
  userId: true,
  user: { select: { id: true, name: true, email: true, image: true } },
  members: { select: { id: true } },
  expenses: { select: { amount: true, currency: true } },
} satisfies Prisma.TripSelect;

export type TripFull = Prisma.TripGetPayload<{ include: typeof tripInclude }>;
export type TripSummaryRow = Prisma.TripGetPayload<{ select: typeof tripSummarySelect }>;

export interface CreateTripData {
  id: string;
  name: string;
  userId: string;
  createdAt?: Date;
}

export interface UpdateTripData {
  name: string;
}

export interface ITripRepository {
  findSummariesOwnedByUser(userId: string): Promise<TripSummaryRow[]>;
  findSummariesByIds(ids: string[]): Promise<TripSummaryRow[]>;
  findByIdFull(id: string): Promise<TripFull | null>;
  findNameAndOwner(id: string): Promise<{ name: string; user: { name: string | null; email: string } | null } | null>;
  create(data: CreateTripData): Promise<{ id: string; name: string; createdAt: Date }>;
  update(id: string, data: UpdateTripData): Promise<{ id: string; name: string; createdAt: Date }>;
  delete(id: string, userId: string): Promise<void>;
}
