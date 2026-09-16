import { withApiRoute } from '@/server/http/route-helpers';
import { userRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const POST = withApiRoute((request) => userRoutes().changePassword(request));
