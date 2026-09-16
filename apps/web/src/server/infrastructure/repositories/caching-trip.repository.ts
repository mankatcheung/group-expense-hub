import type { ITripRepository } from '../../application/ports/repositories/trip.repository';
import type { ICache } from '../../application/ports/cache';
import { CACHE } from '@group-expense-hub/db/constants';

const TTL = CACHE.TRIPS_STALE_TIME;

// Only findNameAndOwner is cached (used for invite email text, where a
// briefly stale trip name is harmless). Trip lists and full trips are read
// from the database every time: the cache is per server instance, so on
// Vercel a write handled by one instance can't invalidate another's copy,
// and summaries embed member/expense data that changes through other
// repositories with no reference to this cache.
export function createCachingTripRepository({ repository, cache }: { repository: ITripRepository; cache: ICache }): ITripRepository {
  return {
    findSummariesOwnedByUser: (userId) => repository.findSummariesOwnedByUser(userId),

    findSummariesByIds: (ids) => (ids.length === 0 ? Promise.resolve([]) : repository.findSummariesByIds(ids)),

    findByIdFull: (id) => repository.findByIdFull(id),

    findNameAndOwner: (id) =>
      cache.getOrFetch(`trip:name:${id}`, () => repository.findNameAndOwner(id), TTL),

    create: (data) => repository.create(data),

    async update(id, data) {
      const result = await repository.update(id, data);
      cache.delete(`trip:name:${id}`);
      return result;
    },

    async delete(id, userId) {
      await repository.delete(id, userId);
      cache.delete(`trip:name:${id}`);
    },
  };
}
