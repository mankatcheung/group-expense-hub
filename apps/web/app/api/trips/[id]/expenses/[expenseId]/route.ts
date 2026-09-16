import { withApiRoute } from '@/server/http/route-helpers';
import { expenseRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

type Params = { id: string; expenseId: string };

export const PUT = withApiRoute<Params>((request, context) => expenseRoutes().update(request, context));
export const DELETE = withApiRoute<Params>((request, context) => expenseRoutes().remove(request, context));
