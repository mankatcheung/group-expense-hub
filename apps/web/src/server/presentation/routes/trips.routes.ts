import { NextResponse, type NextRequest } from 'next/server';
import {
  CreateTripRequestSchema,
  InviteMemberRequestSchema,
  UpdateTripRequestSchema,
} from '@group-expense-hub/db/schemas';
import type { IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { GetTripsUseCase } from '../../application/use-cases/trips/get-trips.use-case';
import type { CreateTripUseCase } from '../../application/use-cases/trips/create-trip.use-case';
import type { GetTripUseCase } from '../../application/use-cases/trips/get-trip.use-case';
import type { UpdateTripUseCase } from '../../application/use-cases/trips/update-trip.use-case';
import type { DeleteTripUseCase } from '../../application/use-cases/trips/delete-trip.use-case';
import type { InviteMemberUseCase } from '../../application/use-cases/trips/invite-member.use-case';
import type { JoinTripUseCase } from '../../application/use-cases/trips/join-trip.use-case';
import type { RemoveCollaboratorUseCase } from '../../application/use-cases/trips/remove-collaborator.use-case';
import { parseBody } from '../../http/validate-request';
import { badRequest, jsonError, rateLimit, readJsonBody, requireAuth, type RouteContext } from '../../http/route-helpers';
import { formatTrip, formatTripSummary } from '../formatters/trip.formatter';

export type TripRouteDeps = {
  authService: IAuthService;
  getTrips: GetTripsUseCase;
  createTrip: CreateTripUseCase;
  getTrip: GetTripUseCase;
  updateTrip: UpdateTripUseCase;
  deleteTrip: DeleteTripUseCase;
  inviteMember: InviteMemberUseCase;
  joinTrip: JoinTripUseCase;
  removeCollaborator: RemoveCollaboratorUseCase;
  apiRateLimiter: IRateLimitService;
  authRateLimiter: IRateLimitService;
  emailRateLimiter: IRateLimitService;
};

type TripParams = { id: string };
type CollaboratorParams = { id: string; memberId: string };
type JoinParams = { token: string };

export function createTripRoutes(deps: TripRouteDeps) {
  return {
    async list(request: NextRequest): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const trips = await deps.getTrips(user.id);
      return NextResponse.json(trips.map((t) => formatTripSummary(t, user.id)));
    },

    async create(request: NextRequest): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const body = parseBody(CreateTripRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const { id, name, createdAt } = body.data;
      const trip = await deps.createTrip({ id, name, createdAt }, user.id);
      return NextResponse.json({
        id: trip.id,
        name: trip.name,
        members: [],
        tripMembers: [],
        expenses: [],
        createdAt: trip.createdAt.toISOString(),
        isOwner: true,
        owner: null,
      });
    },

    async get(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id } = await params;
      const trip = await deps.getTrip(id, user.id);
      if (!trip) return jsonError(404, 'Trip not found');
      return NextResponse.json(formatTrip(trip, user.id));
    },

    async update(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id } = await params;
      const body = parseBody(UpdateTripRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.updateTrip(id, body.data.name, user.id);
      if ('error' in result) return jsonError(403, 'Not authorized to edit this trip');
      return NextResponse.json(result);
    },

    async remove(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id } = await params;
      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      await deps.deleteTrip(id, user.id);
      return NextResponse.json({ success: true });
    },

    async invite(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId } = await params;
      const body = parseBody(InviteMemberRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.emailRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.inviteMember(tripId, body.data.email, user.id);
      switch (result.type) {
        case 'error':
          if (result.reason === 'forbidden') return jsonError(403, 'Only the owner can invite members');
          if (result.reason === 'trip_not_found') return jsonError(404, 'Trip not found');
          if (result.reason === 'already_member') return jsonError(400, 'User is already a member');
          return jsonError(400, 'Cannot invite yourself');
        case 'already_sent':
          return NextResponse.json({ success: true, message: 'Invitation already sent', pending: true });
        case 'invitation_sent':
          return NextResponse.json({ success: true, message: `Invitation sent to ${result.email}`, pending: true });
        case 'user_added':
          return NextResponse.json({
            success: true,
            message: 'User added to trip',
            user: { id: result.userId, name: result.userName, email: result.userEmail, image: result.userImage },
            member: { id: result.memberId, name: result.memberName, color: result.memberColor },
          });
      }
    },

    async removeCollaborator(request: NextRequest, { params }: RouteContext<CollaboratorParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId, memberId } = await params;
      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.removeCollaborator(tripId, memberId, user.id);
      if (result.type === 'error') {
        return result.reason === 'forbidden'
          ? jsonError(403, 'Only the owner can remove members')
          : jsonError(404, 'Member not found');
      }
      return NextResponse.json({ success: true });
    },

    async join(request: NextRequest, { params }: RouteContext<JoinParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { token } = await params;
      const limited = await rateLimit(deps.authRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.joinTrip(token, user.id);
      if (result.type === 'success') return NextResponse.json({ success: true, tripId: result.tripId });
      if (result.reason === 'not_found') return jsonError(404, 'Invalid invitation');
      if (result.reason === 'expired') return jsonError(400, 'Invitation expired');
      if (result.reason === 'already_used') return jsonError(400, 'Invitation already used');
      return jsonError(400, 'Already a member');
    },
  };
}
