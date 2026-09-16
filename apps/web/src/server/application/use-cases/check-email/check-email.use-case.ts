import type { IUserRepository } from '../../../application/ports/repositories/user.repository';

type Deps = { userRepository: IUserRepository };

export type CheckEmailUseCase = (email: string) => Promise<{ available: boolean }>;

export function createCheckEmailUseCase({ userRepository }: Deps): CheckEmailUseCase {
  return async (email) => {
    const existing = await userRepository.findByEmail(email);
    return { available: !existing };
  };
}
