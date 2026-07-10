import type { IUserRepository } from '../../../application/ports/repositories/user.repository.js';
import type { AuthUser } from '../../../application/ports/services/auth.service.js';

type Deps = { userRepository: IUserRepository };

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export type UpdateProfileResult = { type: 'success' } | { type: 'error'; reason: 'email_taken' };

export type UpdateProfileUseCase = (user: AuthUser, input: UpdateProfileInput) => Promise<UpdateProfileResult>;

export function createUpdateProfileUseCase({ userRepository }: Deps): UpdateProfileUseCase {
  return async (user, input) => {
    if (input.name) {
      await userRepository.update(user.id, { name: input.name });
    }

    if (input.email && input.email !== user.email) {
      const existing = await userRepository.findByEmail(input.email);
      if (existing) return { type: 'error', reason: 'email_taken' };
      await userRepository.update(user.id, { email: input.email });
    }

    return { type: 'success' };
  };
}
