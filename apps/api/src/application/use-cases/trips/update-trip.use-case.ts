import type { ITripRepository } from '../../../application/ports/repositories/trip.repository.js';
import type { ITripAccessService } from '../../../application/ports/services/trip-access.service.js';

type Deps = { tripRepository: ITripRepository; tripAccessService: ITripAccessService };

export type UpdateTripResult = { id: string; name: string; createdAt: Date } | { error: 'not_found' | 'forbidden' };

export type UpdateTripUseCase = (tripId: string, name: string, userId: string) => Promise<UpdateTripResult>;

export function createUpdateTripUseCase({ tripRepository, tripAccessService }: Deps): UpdateTripUseCase {
  return async (tripId, name, userId) => {
    const canEdit = await tripAccessService.canEdit(tripId, userId);
    if (!canEdit) return { error: 'forbidden' };
    return tripRepository.update(tripId, { name });
  };
}
