import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from './route.js';

vi.mock('@/lib/validate-origin', () => ({
  validateOrigin: vi.fn(() => null),
}));

import { validateOrigin } from '@/lib/validate-origin';

function makeRequest(
  method: string,
  {
    url = 'http://localhost:3000/api/trips',
    cookie,
    origin,
    body,
  }: { url?: string; cookie?: string; origin?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe('API proxy route', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(validateOrigin).mockReturnValue(null);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GET', () => {
    it('short-circuits with the validateOrigin error when present', async () => {
      const blocked = NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
      vi.mocked(validateOrigin).mockReturnValue(blocked);

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards the request to the API with the path, query string, and only auth cookies', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
      );

      await GET(
        makeRequest('GET', {
          url: 'http://localhost:3000/api/trips?tab=invitations',
          cookie: 'better-auth.session_token=abc; unrelated=xyz; better-auth.csrf-token=def',
          origin: 'http://localhost:3000',
        }),
        makeParams(['trips'])
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4040/api/trips?tab=invitations',
        expect.objectContaining({
          method: 'GET',
          headers: {
            cookie: 'better-auth.session_token=abc; better-auth.csrf-token=def',
            origin: 'http://localhost:3000',
          },
        })
      );
    });

    it('falls back to the app origin when no Origin header is present', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      await GET(makeRequest('GET'), makeParams(['trips']));

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.origin).toBe('http://localhost:3000');
    });

    it('maps a 401 from the API to a generic Unauthorized body', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 401 }));

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('maps a 403 from the API to a generic Unauthorized body', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 403 }));

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('passes through the API response body and status on success', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 'trip-1' }]), { status: 200 }));

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([{ id: 'trip-1' }]);
    });

    it('rewrites the Set-Cookie domain/path to the app origin', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'set-cookie':
              'better-auth.session_token=abc; Path=/old; Domain=api.example.com; HttpOnly',
          },
        })
      );

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('better-auth.session_token=abc');
      expect(setCookie).toContain('Domain=localhost');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).not.toContain('api.example.com');
    });

    it('returns 500 when the upstream fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const res = await GET(makeRequest('GET'), makeParams(['trips']));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed to connect to API' });
    });
  });

  describe('POST', () => {
    it('short-circuits with the validateOrigin error when present', async () => {
      const blocked = NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
      vi.mocked(validateOrigin).mockReturnValue(blocked);

      const res = await POST(makeRequest('POST', { body: {} }), makeParams(['trips']));

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards the JSON body and content-type to the API', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'trip-1' }), { status: 200 }));

      await POST(
        makeRequest('POST', { body: { id: 'trip-1', name: 'Bali' }, origin: 'http://localhost:3000' }),
        makeParams(['trips'])
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4040/api/trips',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ id: 'trip-1', name: 'Bali' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('maps a 401 from the API to a generic Unauthorized body', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 401 }));

      const res = await POST(makeRequest('POST', { body: {} }), makeParams(['trips']));

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 when the upstream fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const res = await POST(makeRequest('POST', { body: {} }), makeParams(['trips']));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed to connect to API' });
    });
  });

  describe('PUT', () => {
    it('short-circuits with the validateOrigin error when present', async () => {
      const blocked = NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
      vi.mocked(validateOrigin).mockReturnValue(blocked);

      const res = await PUT(makeRequest('PUT', { body: {} }), makeParams(['trips', 'trip-1']));

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards the JSON body to the API', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'trip-1' }), { status: 200 }));

      await PUT(
        makeRequest('PUT', { body: { name: 'Renamed' } }),
        makeParams(['trips', 'trip-1'])
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4040/api/trips/trip-1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) })
      );
    });

    it('returns 500 when the upstream fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const res = await PUT(makeRequest('PUT', { body: {} }), makeParams(['trips', 'trip-1']));

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('short-circuits with the validateOrigin error when present', async () => {
      const blocked = NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
      vi.mocked(validateOrigin).mockReturnValue(blocked);

      const res = await DELETE(makeRequest('DELETE'), makeParams(['trips', 'trip-1']));

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards the path and query string with no body', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

      await DELETE(
        makeRequest('DELETE', { url: 'http://localhost:3000/api/trips/trip-1/members/m1?force=true' }),
        makeParams(['trips', 'trip-1', 'members', 'm1'])
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4040/api/trips/trip-1/members/m1?force=true',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('maps a 403 from the API to a generic Unauthorized body', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 403 }));

      const res = await DELETE(makeRequest('DELETE'), makeParams(['trips', 'trip-1']));

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 when the upstream fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const res = await DELETE(makeRequest('DELETE'), makeParams(['trips', 'trip-1']));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed to connect to API' });
    });
  });
});
