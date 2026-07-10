import type { ITripRepository, TripFull } from '../../../application/ports/repositories/trip.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { tripRepository: ITripRepository; tripAccessService: ITripAccessService };

export type GetTripUseCase = (tripId: string, userId: string) => Promise<TripFull | null>;

export function createGetTripUseCase({ tripRepository, tripAccessService }: Deps): GetTripUseCase {
  return async (tripId, userId) => {
    const hasAccess = await tripAccessService.getAccessLevel(tripId, userId);
    if (!hasAccess) return null;
    return tripRepository.findByIdFull(tripId);
  };
}
