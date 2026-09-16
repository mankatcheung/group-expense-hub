import { withApiRoute } from '@/server/http/route-helpers';
import { expenseRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const POST = withApiRoute<{ id: string }>((request, context) => expenseRoutes().create(request, context));
