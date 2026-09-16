import { withApiRoute } from '@/server/http/route-helpers';
import { tripRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withApiRoute<Params>((request, context) => tripRoutes().get(request, context));
export const PUT = withApiRoute<Params>((request, context) => tripRoutes().update(request, context));
export const DELETE = withApiRoute<Params>((request, context) => tripRoutes().remove(request, context));
