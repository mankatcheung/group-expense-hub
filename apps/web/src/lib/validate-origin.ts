import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Returns a 403 NextResponse if the request's Origin header isn't on the
 * allowlist, or null if the request should proceed.
 *
 * Browsers only attach an Origin header to cross-origin requests and to
 * same-origin state-changing requests (POST/PUT/DELETE) - same-origin
 * GET/HEAD requests normally have no Origin header at all. So a missing
 * Origin is only treated as suspicious for mutating methods; for GET/HEAD
 * it's the expected, legitimate case. If an Origin header IS present
 * (which cross-origin fetches always send, regardless of method), it must
 * still match the allowlist - that's what actually blocks cross-origin
 * credentialed reads.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin) {
    const isMutating = request.method !== 'GET' && request.method !== 'HEAD';
    if (isMutating && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
    }
    return null;
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
  allowedOrigins.push(appUrl, 'http://localhost:3000', 'http://127.0.0.1:3000');

  const normalizedOrigin = origin.replace(/\/$/, '');
  const isAllowed = allowedOrigins.some(
    (allowed) => allowed.replace(/\/$/, '') === normalizedOrigin
  );

  if (!isAllowed) {
    return NextResponse.json({ error: 'Invalid origin header' }, { status: 403 });
  }

  return null;
}
