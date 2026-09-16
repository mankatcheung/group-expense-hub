import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCachingTripRepository } from './caching-trip.repository';
import type { ITripRepository } from '../../application/ports/repositories/trip.repository';
import type { ICache } from '../../application/ports/cache';

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
    it('reads from the repository without caching', async () => {
      await cached.findSummariesOwnedByUser('u1');
      expect(repository.findSummariesOwnedByUser).toHaveBeenCalledWith('u1');
      expect(cache.getOrFetch).not.toHaveBeenCalled();
    });
  });

  describe('findSummariesByIds', () => {
    it('returns [] immediately for empty ids', async () => {
      const result = await cached.findSummariesByIds([]);
      expect(result).toEqual([]);
      expect(repository.findSummariesByIds).not.toHaveBeenCalled();
    });

    it('reads from the repository without caching', async () => {
      await cached.findSummariesByIds(['c', 'a']);
      expect(repository.findSummariesByIds).toHaveBeenCalledWith(['c', 'a']);
      expect(cache.getOrFetch).not.toHaveBeenCalled();
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
    it('creates through the repository without touching the cache', async () => {
      await cached.create({ id: 't1', name: 'Trip', userId: 'u1' });
      expect(repository.create).toHaveBeenCalledWith({ id: 't1', name: 'Trip', userId: 'u1' });
      expect(cache.delete).not.toHaveBeenCalled();
      expect(cache.deleteByPrefix).not.toHaveBeenCalled();
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
    it('invalidates trip:name after deleting', async () => {
      await cached.delete('t1', 'u1');
      expect(repository.delete).toHaveBeenCalledWith('t1', 'u1');
      expect(cache.delete).toHaveBeenCalledWith('trip:name:t1');
      expect(cache.deleteByPrefix).not.toHaveBeenCalled();
    });
  });
});
