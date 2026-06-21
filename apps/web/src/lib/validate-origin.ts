import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Returns a 403 NextResponse if the request's Origin header isn't on the
 * allowlist, or null if the request should proceed. Applies to every
 * method (including GET) since session cookies are forwarded regardless
 * of method.
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
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
