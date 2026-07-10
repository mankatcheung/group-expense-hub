import type { ITripRepository } from '../../application/ports/repositories/trip.repository.js';
import type { ICache } from '../../application/ports/cache.js';
import { CACHE } from '@group-expense-hub/db/constants';

const TTL = CACHE.TRIPS_STALE_TIME;

// findByIdFull is intentionally NOT cached: it embeds members, expenses, and
// splits, all of which mutate through repositories that have no reference to
// this cache. Caching it would require propagating cache invalidation into
// every member/expense use case, which couples infrastructure to the
// application layer.
export function createCachingTripRepository({ repository, cache }: { repository: ITripRepository; cache: ICache }): ITripRepository {
  return {
    findSummariesOwnedByUser: (userId) =>
      cache.getOrFetch(`trips:user:${userId}`, () => repository.findSummariesOwnedByUser(userId), TTL),

    findSummariesByIds: (ids) => {
      if (ids.length === 0) return Promise.resolve([]);
      const key = `trips:ids:${[...ids].sort().join(',')}`;
      return cache.getOrFetch(key, () => repository.findSummariesByIds(ids), TTL);
    },

    findByIdFull: (id) => repository.findByIdFull(id),

    findNameAndOwner: (id) =>
      cache.getOrFetch(`trip:name:${id}`, () => repository.findNameAndOwner(id), TTL),

    async create(data) {
      const result = await repository.create(data);
      cache.deleteByPrefix(`trips:user:${data.userId}`);
      return result;
    },

    async update(id, data) {
      const result = await repository.update(id, data);
      cache.delete(`trip:name:${id}`);
      return result;
    },

    async delete(id, userId) {
      await repository.delete(id, userId);
      cache.delete(`trip:name:${id}`);
      cache.deleteByPrefix(`trips:user:${userId}`);
    },
  };
}
