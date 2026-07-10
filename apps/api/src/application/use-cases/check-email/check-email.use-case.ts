import type { IEmailBloomFilterService } from '../../../application/ports/services/email-bloom-filter.service.js';
import type { IUserRepository } from '../../../application/ports/repositories/user.repository.js';

type Deps = { emailBloomFilterService: IEmailBloomFilterService; userRepository: IUserRepository };

export type CheckEmailUseCase = (email: string) => Promise<{ available: boolean }>;

export function createCheckEmailUseCase({ emailBloomFilterService, userRepository }: Deps): CheckEmailUseCase {
  return async (email) => {
    if (!emailBloomFilterService.has(email)) return { available: true };
    const existing = await userRepository.findByEmail(email);
    return { available: !existing };
  };
}
