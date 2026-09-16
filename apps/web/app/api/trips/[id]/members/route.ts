import { withApiRoute } from '@/server/http/route-helpers';
import { memberRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const POST = withApiRoute<{ id: string }>((request, context) => memberRoutes().create(request, context));
