import { NextResponse, type NextRequest } from 'next/server';
import type { IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { GetInvitationsUseCase } from '../../application/use-cases/invitations/get-invitations.use-case';
import type { AcceptInvitationUseCase } from '../../application/use-cases/invitations/accept-invitation.use-case';
import { jsonError, rateLimit, requireAuth, type RouteContext } from '../../http/route-helpers';

export type InvitationRouteDeps = {
  authService: IAuthService;
  getInvitations: GetInvitationsUseCase;
  acceptInvitation: AcceptInvitationUseCase;
  apiRateLimiter: IRateLimitService;
};

type InvitationParams = { id: string };

export function createInvitationRoutes(deps: InvitationRouteDeps) {
  return {
    async list(request: NextRequest): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const invitations = await deps.getInvitations(user.email);
      return NextResponse.json(
        invitations.map((inv) => ({
          id: inv.id,
          token: inv.token,
          tripId: inv.tripId,
          tripName: inv.trip.name,
          inviter: inv.trip.user,
          createdAt: inv.createdAt.toISOString(),
        }))
      );
    },

    async accept(request: NextRequest, { params }: RouteContext<InvitationParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id } = await params;
      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.acceptInvitation(id, user);
      if (result.type === 'success') return NextResponse.json({ success: true, tripId: result.tripId });
      if (result.reason === 'not_found') return jsonError(404, 'Invitation not found');
      if (result.reason === 'wrong_user') return jsonError(403, 'This invitation is not for you');
      if (result.reason === 'expired') return jsonError(400, 'Invitation expired');
      if (result.reason === 'already_used') return jsonError(400, 'Invitation already used');
      return jsonError(400, 'Already a member');
    },
  };
}
