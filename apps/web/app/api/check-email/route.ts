import { withApiRoute } from '@/server/http/route-helpers';
import { checkEmailRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const GET = withApiRoute((request) => checkEmailRoutes().check(request));
