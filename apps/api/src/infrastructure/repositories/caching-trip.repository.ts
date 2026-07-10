import type { ITripRepository } from '../../application/ports/repositories/trip.repository.js';
import type { ICache } from '../../application/ports/cache.js';
import { CACHE } from '@group-expense-hub/db/constants';

const TTL = CACHE.TRIPS_STALE_TIME;

export function createCachingTripRepository({ repository, cache }: { repository: ITripRepository; cache: ICache }): ITripRepository {
  return {
    findSummariesOwnedByUser: (userId) =>
      cache.getOrFetch(`trips:user:${userId}`, () => repository.findSummariesOwnedByUser(userId), TTL),

    findSummariesByIds: (ids) => {
      if (ids.length === 0) return Promise.resolve([]);
      const key = `trips:ids:${[...ids].sort().join(',')}`;
      return cache.getOrFetch(key, () => repository.findSummariesByIds(ids), TTL);
    },

    findByIdFull: (id) =>
      cache.getOrFetch(`trip:full:${id}`, () => repository.findByIdFull(id), TTL),

    findNameAndOwner: (id) =>
      cache.getOrFetch(`trip:name:${id}`, () => repository.findNameAndOwner(id), TTL),

    async create(data) {
      const result = await repository.create(data);
      cache.deleteByPrefix(`trips:user:${data.userId}`);
      return result;
    },

    async update(id, data) {
      const result = await repository.update(id, data);
      cache.delete(`trip:full:${id}`);
      cache.delete(`trip:name:${id}`);
      return result;
    },

    async delete(id, userId) {
      await repository.delete(id, userId);
      cache.delete(`trip:full:${id}`);
      cache.delete(`trip:name:${id}`);
      cache.deleteByPrefix(`trips:user:${userId}`);
    },
  };
}
