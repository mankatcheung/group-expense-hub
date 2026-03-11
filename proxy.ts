import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const { pathname, searchParams } = request.nextUrl;

  const isFormSubmission =
    request.method === 'POST' ||
    request.method === 'PUT' ||
    request.method === 'DELETE' ||
    searchParams.has('_data');

  const isServerAction =
    isFormSubmission &&
    (pathname.startsWith('/api/') ||
      pathname.startsWith('/trpc/') ||
      request.headers.get('x-nextjs-data') === '1');

  if (isServerAction) {
    if (origin) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
      allowedOrigins.push(appUrl);
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://127.0.0.1:3000');

      const normalizedOrigin = origin.replace(/\/$/, '');

      const isAllowed = allowedOrigins.some((allowed) => {
        const normalizedAllowed = allowed.replace(/\/$/, '');
        return normalizedOrigin === normalizedAllowed;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Invalid origin header' },
          { status: 403 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Missing origin header' },
        { status: 403 }
      );
    }
  }

  const sessionToken =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.getAll().find((c) => c.name.endsWith('better-auth.session_token'));

  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!sessionToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
