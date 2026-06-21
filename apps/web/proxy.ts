import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateOrigin } from '@/lib/validate-origin';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Note: this middleware's matcher excludes /api/* — origin validation for
  // those routes lives in apps/web/app/api/[...path]/route.ts instead, since
  // that's the code path that actually runs for API requests.
  const isFormSubmission =
    request.method === 'POST' ||
    request.method === 'PUT' ||
    request.method === 'DELETE' ||
    searchParams.has('_data');

  const isServerAction =
    isFormSubmission &&
    (pathname.startsWith('/trpc/') || request.headers.get('x-nextjs-data') === '1');

  if (isServerAction) {
    const originError = validateOrigin(request);
    if (originError) return originError;
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
