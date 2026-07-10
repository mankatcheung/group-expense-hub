import type { ITripRepository } from '../../../application/ports/repositories/trip.repository.js';

type Deps = { tripRepository: ITripRepository };

export type DeleteTripUseCase = (tripId: string, userId: string) => Promise<void>;

export function createDeleteTripUseCase({ tripRepository }: Deps): DeleteTripUseCase {
  return (tripId, userId) => tripRepository.delete(tripId, userId);
}
