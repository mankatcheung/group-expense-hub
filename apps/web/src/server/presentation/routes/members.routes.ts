import { NextResponse, type NextRequest } from 'next/server';
import { CreateMemberRequestSchema, UpdateMemberRequestSchema } from '@group-expense-hub/db/schemas';
import type { IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { CreateMemberUseCase } from '../../application/use-cases/members/create-member.use-case';
import type { UpdateMemberUseCase } from '../../application/use-cases/members/update-member.use-case';
import type { DeleteMemberUseCase } from '../../application/use-cases/members/delete-member.use-case';
import { parseBody } from '../../http/validate-request';
import { badRequest, jsonError, rateLimit, readJsonBody, requireAuth, type RouteContext } from '../../http/route-helpers';

export type MemberRouteDeps = {
  authService: IAuthService;
  createMember: CreateMemberUseCase;
  updateMember: UpdateMemberUseCase;
  deleteMember: DeleteMemberUseCase;
  apiRateLimiter: IRateLimitService;
};

type TripParams = { id: string };
type MemberParams = { id: string; memberId: string };

const FORBIDDEN = 'Not authorized to edit this trip';

export function createMemberRoutes(deps: MemberRouteDeps) {
  return {
    async create(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId } = await params;
      const body = parseBody(CreateMemberRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const { id, name, color } = body.data;
      const result = await deps.createMember(tripId, { id, name, color }, user.id);
      if (result.type === 'error') return jsonError(403, FORBIDDEN);
      return NextResponse.json(result.member);
    },

    async update(request: NextRequest, { params }: RouteContext<MemberParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId, memberId } = await params;
      const body = parseBody(UpdateMemberRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.updateMember(tripId, memberId, body.data.name, user.id);
      if (result.type === 'error') {
        return result.reason === 'forbidden' ? jsonError(403, FORBIDDEN) : jsonError(404, 'Member not found');
      }
      return NextResponse.json(result.member);
    },

    // The client sends `?force=`, but deletion has never honored it: a member
    // with expenses always gets the warning below.
    async remove(request: NextRequest, { params }: RouteContext<MemberParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId, memberId } = await params;
      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.deleteMember(tripId, memberId, user.id);
      if (result.type === 'error') {
        return result.reason === 'forbidden' ? jsonError(403, FORBIDDEN) : jsonError(404, 'Member not found');
      }
      if (result.type === 'has_expenses') {
        // 200, not 4xx: the client reads this body to show a confirmation.
        return NextResponse.json({
          error: 'Member has expenses',
          expenseCount: result.expenseCount,
          memberName: result.memberName,
        });
      }
      return NextResponse.json({ success: true });
    },
  };
}
