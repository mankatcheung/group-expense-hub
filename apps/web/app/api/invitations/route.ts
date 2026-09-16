import { withApiRoute } from '@/server/http/route-helpers';
import { invitationRoutes } from '@/server/presentation/routes';

export const runtime = 'nodejs';

export const GET = withApiRoute((request) => invitationRoutes().list(request));
