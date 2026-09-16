import type { User } from '../../../domain/entities/user';

export type AuthUser = User;

export interface IAuthService {
  getCurrentUser(headers: Headers): Promise<AuthUser | null>;
}
