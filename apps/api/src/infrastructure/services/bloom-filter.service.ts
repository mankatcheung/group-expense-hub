import type { IEmailBloomFilterService } from '../../application/ports/services/email-bloom-filter.service.js';

export function createBloomFilterService(filter: { has(email: string): boolean; add(email: string): void }): IEmailBloomFilterService {
  return {
    has(email) { return filter.has(email); },
    add(email) { filter.add(email); },
  };
}
