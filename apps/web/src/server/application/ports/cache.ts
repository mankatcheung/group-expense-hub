export interface ICache {
  getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number, beta?: number): Promise<T>;
  delete(key: string): void;
  deleteByPrefix(prefix: string): void;
}
