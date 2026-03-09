import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  // Dynamically catch both local and secure production cookies
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies
      .getAll()
      .find((c) => c.name.endsWith("better-auth.session_token"));
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.includes(pathname);

  // If user is authenticated and trying to access auth pages, redirect to home
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is NOT authenticated and trying to access protected pages, redirect to login
  if (!sessionToken && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - api (API routes)
     * - _next (Next.js internals)
     * - static files (favicon, images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
