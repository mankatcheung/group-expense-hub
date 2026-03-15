import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getSessionCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return '';

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookies = cookies.filter(
    (c) =>
      c.startsWith('better-auth.session_token') ||
      c.startsWith('better-auth.csrf-token') ||
      c.startsWith('__Secure-better-auth.session_token') ||
      c.startsWith('__Host-better-auth.csrf-token')
  );

  return sessionCookies.join('; ');
}

function rewriteCookie(setCookie: string): string {
  const url = new URL(APP_URL);
  const domain = url.hostname;

  const parts = setCookie.split(';').map((p) => p.trim());
  const [cookiePart] = parts;

  const filtered = parts.filter(
    (p) => !p.toLowerCase().startsWith('domain=') && !p.toLowerCase().startsWith('path=')
  );

  if (!filtered.some((p) => p.toLowerCase().startsWith('domain='))) {
    filtered.splice(1, 0, `Domain=${domain}`);
  }

  if (!filtered.some((p) => p.toLowerCase().startsWith('path='))) {
    filtered.splice(2, 0, 'Path=/');
  }

  return filtered.join('; ');
}

function forwardCookies(response: Response, nextResponse: NextResponse): NextResponse {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const rewritten = rewriteCookie(setCookie);
    nextResponse.headers.set('set-cookie', rewritten);
  }

  return nextResponse;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = new URL(request.url);
  const searchParams = url.search;

  const targetUrl = `${API_URL}/api/${pathStr}${searchParams}`;

  const headers: Record<string, string> = {};
  const cookie = getSessionCookie(request.headers.get('cookie'));

  if (cookie) {
    headers.cookie = cookie;
  }

  const origin = request.headers.get('origin') || APP_URL;
  headers.origin = origin;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: response.status });
    }

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    return forwardCookies(response, nextResponse);
  } catch {
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');

  const targetUrl = `${API_URL}/api/${pathStr}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const cookie = getSessionCookie(request.headers.get('cookie'));

  if (cookie) {
    headers.cookie = cookie;
  }

  const origin = request.headers.get('origin') || APP_URL;
  headers.origin = origin;

  const body = await request.json();

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: response.status });
    }

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    return forwardCookies(response, nextResponse);
  } catch {
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');

  const targetUrl = `${API_URL}/api/${pathStr}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const cookie = getSessionCookie(request.headers.get('cookie'));

  if (cookie) {
    headers.cookie = cookie;
  }

  const origin = request.headers.get('origin') || APP_URL;
  headers.origin = origin;

  const body = await request.json();

  try {
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: response.status });
    }

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    return forwardCookies(response, nextResponse);
  } catch {
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = new URL(request.url);
  const searchParams = url.search;

  const targetUrl = `${API_URL}/api/${pathStr}${searchParams}`;

  const headers: Record<string, string> = {};
  const cookie = getSessionCookie(request.headers.get('cookie'));

  if (cookie) {
    headers.cookie = cookie;
  }

  const origin = request.headers.get('origin') || APP_URL;
  headers.origin = origin;

  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: response.status });
    }

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    return forwardCookies(response, nextResponse);
  } catch {
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}
