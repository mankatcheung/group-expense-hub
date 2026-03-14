import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4040';

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
  const cookie = request.headers.get('cookie');
  console.log('[PROXY GET] Cookie from browser:', cookie?.substring(0, 150));
  if (cookie) {
    headers.cookie = cookie;
  }

  try {
    console.log(
      '[PROXY GET] Forwarding to:',
      targetUrl,
      'with headers:',
      headers.cookie?.substring(0, 150)
    );
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

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('set-cookie', setCookie);
    }

    return nextResponse;
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
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.cookie = cookie;
  }

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

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('set-cookie', setCookie);
    }

    return nextResponse;
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
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.cookie = cookie;
  }

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

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('set-cookie', setCookie);
    }

    return nextResponse;
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
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.cookie = cookie;
  }

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

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      nextResponse.headers.set('set-cookie', setCookie);
    }

    return nextResponse;
  } catch {
    return NextResponse.json({ error: 'Failed to connect to API' }, { status: 500 });
  }
}
