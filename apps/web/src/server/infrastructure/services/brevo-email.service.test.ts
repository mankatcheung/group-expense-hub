import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBrevoEmailService } from './brevo-email.service';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
  vi.stubEnv('BREVO_API_KEY', 'test-key');
  vi.stubEnv('BREVO_SENDER_EMAIL', 'noreply@splittrip.test');
  vi.stubEnv('BREVO_SENDER_NAME', 'SplitTrip');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function sentBody() {
  const [, init] = fetchMock.mock.calls[0]!;
  return JSON.parse(init.body as string);
}

describe('createBrevoEmailService', () => {
  it('reads the app URL from NEXT_PUBLIC_APP_URL', () => {
    expect(createBrevoEmailService().getAppUrl()).toBe('https://app.example.com');
  });

  it('defaults the app URL to the local web app', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    expect(createBrevoEmailService().getAppUrl()).toBe('http://localhost:3000');
  });

  it('sends a password reset email through the Brevo API', async () => {
    await createBrevoEmailService().sendPasswordResetEmail({ to: 'a@example.com', name: 'Alice', resetUrl: 'https://app.example.com/reset?token=1' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('test-key');
    const body = sentBody();
    expect(body.sender).toEqual({ email: 'noreply@splittrip.test', name: 'SplitTrip' });
    expect(body.to).toEqual([{ email: 'a@example.com' }]);
    expect(body.subject).toBe('Reset Your Password');
    expect(body.htmlContent).toContain('href="https://app.example.com/reset?token=1"');
  });

  it('escapes user-controlled names and trip names in the HTML', async () => {
    await createBrevoEmailService().sendTripInvitationEmail({
      to: 'b@example.com',
      inviterName: '<script>alert(1)</script>',
      tripName: 'Bali "& friends"',
      inviteUrl: 'https://app.example.com/join/t',
    });

    const body = sentBody();
    expect(body.htmlContent).not.toContain('<script>');
    expect(body.htmlContent).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(body.htmlContent).toContain('Bali &quot;&amp; friends&quot;');
    expect(body.subject).toBe('You\'ve been invited to join "Bali &quot;&amp; friends&quot;"');
  });

  it('sends a trip-added notification with the trip link', async () => {
    await createBrevoEmailService().sendTripAddedNotification({
      to: 'c@example.com',
      name: null,
      inviterName: 'Alice',
      tripName: 'Bali',
      tripUrl: 'https://app.example.com/trip/t1',
    });

    expect(sentBody().htmlContent).toContain('href="https://app.example.com/trip/t1"');
  });

  it.each([
    ['sendPasswordResetEmail', { to: 'a@example.com', resetUrl: 'javascript:alert(1)' }, 'Invalid reset URL'],
    ['sendTripInvitationEmail', { to: 'a@example.com', inviterName: 'A', tripName: 'T', inviteUrl: 'ftp://x' }, 'Invalid invitation URL'],
    ['sendTripAddedNotification', { to: 'a@example.com', inviterName: 'A', tripName: 'T', tripUrl: 'not a url' }, 'Invalid trip URL'],
  ] as const)('%s rejects non-http(s) links without sending', async (method, input, message) => {
    const service = createBrevoEmailService();
    await expect((service[method] as (i: typeof input) => Promise<void>)(input)).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips sending, with a warning, when no API key is configured', async () => {
    vi.stubEnv('BREVO_API_KEY', undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await createBrevoEmailService().sendPasswordResetEmail({ to: 'a@example.com', resetUrl: 'https://app.example.com/reset' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('BREVO_API_KEY'));
  });

  it('bounds the Brevo request with a timeout so a hung API cannot hold the function open', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');

    await createBrevoEmailService().sendPasswordResetEmail({ to: 'a@example.com', resetUrl: 'https://app.example.com/reset' });

    expect(timeout).toHaveBeenCalledWith(10_000);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.signal).toBe(timeout.mock.results[0]!.value);
  });

  it('surfaces a timed-out Brevo request as an error', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

    await expect(
      createBrevoEmailService().sendTripInvitationEmail({ to: 'a@example.com', inviterName: 'A', tripName: 'T', inviteUrl: 'https://app.example.com/join/t' })
    ).rejects.toThrow('timeout');
  });

  it('throws with the Brevo error body when the API rejects the request', async () => {
    fetchMock.mockResolvedValue(new Response('invalid sender', { status: 400 }));

    await expect(
      createBrevoEmailService().sendPasswordResetEmail({ to: 'a@example.com', resetUrl: 'https://app.example.com/reset' })
    ).rejects.toThrow('Failed to send email: invalid sender');
  });
});
