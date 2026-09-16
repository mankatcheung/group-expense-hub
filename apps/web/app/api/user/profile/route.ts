import { withApiRoute } from '@/server/http/route-helpers';
import { userRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const PUT = withApiRoute((request) => userRoutes().updateProfile(request));
