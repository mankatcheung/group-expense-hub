import type { ITripRepository, TripSummaryRow } from '../../../application/ports/repositories/trip.repository.js';

type Deps = { tripRepository: ITripRepository; tripMemberRepository: { findIdsByUserId(userId: string): Promise<string[]> } };

export type GetTripsUseCase = (userId: string) => Promise<TripSummaryRow[]>;

export function createGetTripsUseCase({ tripRepository, tripMemberRepository }: Deps): GetTripsUseCase {
  return async (userId) => {
    const [ownedTrips, collaboratorTripIds] = await Promise.all([
      tripRepository.findSummariesOwnedByUser(userId),
      tripMemberRepository.findIdsByUserId(userId),
    ]);
    const collaboratorTrips = await tripRepository.findSummariesByIds(collaboratorTripIds);
    return [...ownedTrips, ...collaboratorTrips];
  };
}
