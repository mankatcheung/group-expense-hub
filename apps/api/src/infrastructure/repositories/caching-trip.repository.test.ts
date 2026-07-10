import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCachingTripRepository } from './caching-trip.repository.js';
import type { ITripRepository } from '../../application/ports/repositories/trip.repository.js';
import type { ICache } from '../../application/ports/cache.js';

function makeRepository(overrides: Partial<ITripRepository> = {}): ITripRepository {
  return {
    findSummariesOwnedByUser: vi.fn().mockResolvedValue([]),
    findSummariesByIds: vi.fn().mockResolvedValue([]),
    findByIdFull: vi.fn().mockResolvedValue(null),
    findNameAndOwner: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 't1', name: 'Trip', createdAt: new Date() }),
    update: vi.fn().mockResolvedValue({ id: 't1', name: 'Updated', createdAt: new Date() }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Pass-through: the cache always delegates to the fetcher so repository is exercised.
function makeCache() {
  return {
    getOrFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
    delete: vi.fn(),
    deleteByPrefix: vi.fn(),
  };
}

describe('createCachingTripRepository', () => {
  let repository: ITripRepository;
  let cache: ReturnType<typeof makeCache>;
  let cached: ITripRepository;

  beforeEach(() => {
    repository = makeRepository();
    cache = makeCache();
    cached = createCachingTripRepository({ repository, cache: cache as unknown as ICache });
  });

  describe('findSummariesOwnedByUser', () => {
    it('calls cache with trips:user:{userId} key', async () => {
      await cached.findSummariesOwnedByUser('u1');
      expect(cache.getOrFetch).toHaveBeenCalledWith('trips:user:u1', expect.any(Function), expect.any(Number));
    });

    it('fetches from repository via the cache fetcher', async () => {
      await cached.findSummariesOwnedByUser('u1');
      expect(repository.findSummariesOwnedByUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('findSummariesByIds', () => {
    it('returns [] immediately without hitting cache for empty ids', async () => {
      const result = await cached.findSummariesByIds([]);
      expect(result).toEqual([]);
      expect(cache.getOrFetch).not.toHaveBeenCalled();
    });

    it('sorts ids before building the cache key', async () => {
      await cached.findSummariesByIds(['c', 'a', 'b']);
      expect(cache.getOrFetch).toHaveBeenCalledWith('trips:ids:a,b,c', expect.any(Function), expect.any(Number));
    });

    it('produces the same key for ids in different order', async () => {
      await cached.findSummariesByIds(['b', 'a']);
      await cached.findSummariesByIds(['a', 'b']);
      expect(cache.getOrFetch).toHaveBeenNthCalledWith(1, 'trips:ids:a,b', expect.any(Function), expect.any(Number));
      expect(cache.getOrFetch).toHaveBeenNthCalledWith(2, 'trips:ids:a,b', expect.any(Function), expect.any(Number));
    });
  });

  describe('findByIdFull', () => {
    it('delegates directly to repository without caching', async () => {
      await cached.findByIdFull('t1');
      expect(repository.findByIdFull).toHaveBeenCalledWith('t1');
      expect(cache.getOrFetch).not.toHaveBeenCalledWith('trip:full:t1', expect.any(Function), expect.any(Number));
    });
  });

  describe('findNameAndOwner', () => {
    it('calls cache with trip:name:{id} key', async () => {
      await cached.findNameAndOwner('t1');
      expect(cache.getOrFetch).toHaveBeenCalledWith('trip:name:t1', expect.any(Function), expect.any(Number));
    });
  });

  describe('create', () => {
    it('invalidates owner trips prefix after creating', async () => {
      await cached.create({ id: 't1', name: 'Trip', userId: 'u1' });
      expect(cache.deleteByPrefix).toHaveBeenCalledWith('trips:user:u1');
    });
  });

  describe('update', () => {
    it('invalidates trip:name after updating', async () => {
      await cached.update('t1', { name: 'New Name' });
      expect(cache.delete).toHaveBeenCalledWith('trip:name:t1');
      expect(cache.delete).not.toHaveBeenCalledWith('trip:full:t1');
    });
  });

  describe('delete', () => {
    it('invalidates trip:name and owner prefix after deleting', async () => {
      await cached.delete('t1', 'u1');
      expect(cache.delete).toHaveBeenCalledWith('trip:name:t1');
      expect(cache.deleteByPrefix).toHaveBeenCalledWith('trips:user:u1');
      expect(cache.delete).not.toHaveBeenCalledWith('trip:full:t1');
    });
  });
});
