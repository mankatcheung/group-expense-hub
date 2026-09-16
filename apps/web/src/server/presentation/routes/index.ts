import { getContainer } from '../../container';
import { createTripRoutes } from './trips.routes';
import { createMemberRoutes } from './members.routes';
import { createExpenseRoutes } from './expenses.routes';
import { createInvitationRoutes } from './invitations.routes';
import { createUserRoutes } from './user.routes';
import { createCheckEmailRoutes } from './check-email.routes';

// Built on first request rather than at import, so `next build` can load
// route modules without constructing Prisma or the rate limiters.
function lazy<T>(build: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= build());
}

export const tripRoutes = lazy(() => {
  const c = getContainer();
  return createTripRoutes({
    authService: c.get('AUTH_SERVICE'),
    getTrips: c.get('GET_TRIPS_USE_CASE'),
    createTrip: c.get('CREATE_TRIP_USE_CASE'),
    getTrip: c.get('GET_TRIP_USE_CASE'),
    updateTrip: c.get('UPDATE_TRIP_USE_CASE'),
    deleteTrip: c.get('DELETE_TRIP_USE_CASE'),
    inviteMember: c.get('INVITE_MEMBER_USE_CASE'),
    joinTrip: c.get('JOIN_TRIP_USE_CASE'),
    removeCollaborator: c.get('REMOVE_COLLABORATOR_USE_CASE'),
    apiRateLimiter: c.get('API_RATE_LIMITER'),
    authRateLimiter: c.get('AUTH_RATE_LIMITER'),
    emailRateLimiter: c.get('EMAIL_RATE_LIMITER'),
  });
});

export const memberRoutes = lazy(() => {
  const c = getContainer();
  return createMemberRoutes({
    authService: c.get('AUTH_SERVICE'),
    createMember: c.get('CREATE_MEMBER_USE_CASE'),
    updateMember: c.get('UPDATE_MEMBER_USE_CASE'),
    deleteMember: c.get('DELETE_MEMBER_USE_CASE'),
    apiRateLimiter: c.get('API_RATE_LIMITER'),
  });
});

export const expenseRoutes = lazy(() => {
  const c = getContainer();
  return createExpenseRoutes({
    authService: c.get('AUTH_SERVICE'),
    createExpense: c.get('CREATE_EXPENSE_USE_CASE'),
    updateExpense: c.get('UPDATE_EXPENSE_USE_CASE'),
    deleteExpense: c.get('DELETE_EXPENSE_USE_CASE'),
    apiRateLimiter: c.get('API_RATE_LIMITER'),
  });
});

export const invitationRoutes = lazy(() => {
  const c = getContainer();
  return createInvitationRoutes({
    authService: c.get('AUTH_SERVICE'),
    getInvitations: c.get('GET_INVITATIONS_USE_CASE'),
    acceptInvitation: c.get('ACCEPT_INVITATION_USE_CASE'),
    apiRateLimiter: c.get('API_RATE_LIMITER'),
  });
});

export const userRoutes = lazy(() => {
  const c = getContainer();
  return createUserRoutes({
    authService: c.get('AUTH_SERVICE'),
    updateProfile: c.get('UPDATE_PROFILE_USE_CASE'),
    authRateLimiter: c.get('AUTH_RATE_LIMITER'),
  });
});

export const checkEmailRoutes = lazy(() => {
  const c = getContainer();
  return createCheckEmailRoutes({
    checkEmail: c.get('CHECK_EMAIL_USE_CASE'),
    apiRateLimiter: c.get('API_RATE_LIMITER'),
  });
});
