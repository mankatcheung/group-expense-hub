import { withApiRoute } from '@/server/http/route-helpers';
import { memberRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

type Params = { id: string; memberId: string };

export const PUT = withApiRoute<Params>((request, context) => memberRoutes().update(request, context));
export const DELETE = withApiRoute<Params>((request, context) => memberRoutes().remove(request, context));
