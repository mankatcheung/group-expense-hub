import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { validateOrigin } from '@/lib/validate-origin';
import { routing } from '@/i18n/routing';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];
const LOCALE_PREFIX_PATTERN = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);

const intlMiddleware = createIntlMiddleware(routing);

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

  // Run locale negotiation/rewriting first. If the path is missing its
  // locale prefix, this returns a redirect - let the browser follow it and
  // re-run this middleware against the now-prefixed path, where the auth
  // check below can run with a known locale.
  const intlResponse = intlMiddleware(request);
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  const localeMatch = pathname.match(LOCALE_PREFIX_PATTERN);
  const localePrefix = localeMatch ? localeMatch[0] : '';
  const pathnameWithoutLocale = pathname.slice(localePrefix.length) || '/';

  const sessionToken =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.getAll().find((c) => c.name.endsWith('better-auth.session_token'));

  const isAuthPage = AUTH_PAGES.includes(pathnameWithoutLocale);

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
  }

  if (!sessionToken && !isAuthPage) {
    return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
