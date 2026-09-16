import { describe, it, expect, vi } from 'vitest';
import { createCheckEmailUseCase } from './check-email.use-case';
import { makeUserRepository } from '../../../test/mocks';

describe('checkEmail', () => {
  it('reports an unregistered email as available', async () => {
    const userRepository = makeUserRepository();
    expect(await createCheckEmailUseCase({ userRepository })('free@example.com')).toEqual({ available: true });
    expect(userRepository.findByEmail).toHaveBeenCalledWith('free@example.com');
  });

  it('reports a registered email as unavailable', async () => {
    const userRepository = makeUserRepository({ findByEmail: vi.fn().mockResolvedValue({ id: 'u1', name: null, email: 'taken@example.com', image: null }) });
    expect(await createCheckEmailUseCase({ userRepository })('taken@example.com')).toEqual({ available: false });
  });
});
