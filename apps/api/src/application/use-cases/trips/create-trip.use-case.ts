import type { ITripRepository } from '../../../application/ports/repositories/trip.repository.js';

type Deps = { tripRepository: ITripRepository };

export interface CreateTripInput {
  id: string;
  name: string;
  createdAt?: string;
}

export type CreateTripUseCase = (input: CreateTripInput, userId: string) => Promise<{ id: string; name: string; createdAt: Date }>;

export function createCreateTripUseCase({ tripRepository }: Deps): CreateTripUseCase {
  return (input, userId) =>
    tripRepository.create({
      id: input.id,
      name: input.name,
      userId,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
    });
}
