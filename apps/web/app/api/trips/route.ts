import { withApiRoute } from '@/server/http/route-helpers';
import { tripRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const GET = withApiRoute((request) => tripRoutes().list(request));
export const POST = withApiRoute((request) => tripRoutes().create(request));
