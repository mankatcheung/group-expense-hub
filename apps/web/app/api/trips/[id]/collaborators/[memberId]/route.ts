import { withApiRoute } from '@/server/http/route-helpers';
import { tripRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const DELETE = withApiRoute<{ id: string; memberId: string }>((request, context) =>
  tripRoutes().removeCollaborator(request, context)
);
