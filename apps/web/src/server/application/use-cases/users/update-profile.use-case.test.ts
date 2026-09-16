import { describe, it, expect, vi } from 'vitest';
import { createUpdateProfileUseCase } from './update-profile.use-case';
import { makeUserRepository } from '../../../test/mocks';

const user = { id: 'u1', name: 'Alice', email: 'alice@example.com', image: null };

describe('updateProfile', () => {
  it('updates the name', async () => {
    const userRepository = makeUserRepository();

    expect(await createUpdateProfileUseCase({ userRepository })(user, { name: 'Alicia' })).toEqual({ type: 'success' });
    expect(userRepository.update).toHaveBeenCalledWith('u1', { name: 'Alicia' });
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('changes the email when it is not in use', async () => {
    const userRepository = makeUserRepository();

    expect(await createUpdateProfileUseCase({ userRepository })(user, { email: 'new@example.com' })).toEqual({ type: 'success' });
    expect(userRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
    expect(userRepository.update).toHaveBeenCalledWith('u1', { email: 'new@example.com' });
  });

  it("refuses an email that belongs to another account and doesn't change the email", async () => {
    const userRepository = makeUserRepository({ findByEmail: vi.fn().mockResolvedValue({ id: 'u2', name: 'Bob', email: 'bob@example.com', image: null }) });

    expect(await createUpdateProfileUseCase({ userRepository })(user, { email: 'bob@example.com' })).toEqual({ type: 'error', reason: 'email_taken' });
    expect(userRepository.update).not.toHaveBeenCalledWith('u1', { email: 'bob@example.com' });
  });

  it('skips the lookup when the email is unchanged', async () => {
    const userRepository = makeUserRepository();

    expect(await createUpdateProfileUseCase({ userRepository })(user, { email: 'alice@example.com' })).toEqual({ type: 'success' });
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
