import { withApiRoute } from '@/server/http/route-helpers';
import { invitationRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const POST = withApiRoute<{ id: string }>((request, context) => invitationRoutes().accept(request, context));
