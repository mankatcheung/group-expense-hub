import { withApiRoute } from '@/server/http/route-helpers';
import { tripRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const POST = withApiRoute<{ id: string }>((request, context) => tripRoutes().invite(request, context));
