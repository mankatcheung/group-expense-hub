import type { IAuthService } from '../../application/ports/services/auth.service';

export function createBetterAuthService({ auth }: { auth: any }): IAuthService {
  return {
    async getCurrentUser(headers: Headers) {
      if (!headers.get('cookie')) return null;
      try {
        const session = await auth.api.getSession({ headers });
        return session?.user ?? null;
      } catch {
        return null;
      }
    },
  };
}
