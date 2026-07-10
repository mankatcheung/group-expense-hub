import type { FastifyRequest } from 'fastify';
import type { User } from '../../../domain/entities/user.js';

export type AuthUser = User;

export interface IAuthService {
  getCurrentUser(request: FastifyRequest): Promise<AuthUser | null>;
}
