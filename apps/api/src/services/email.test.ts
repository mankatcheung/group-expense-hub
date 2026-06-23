import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('email service', () => {
  const originalEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  // BREVO_API_KEY and APP_URL are captured as module-level constants at
  // import time, so each test that depends on a specific env value must
  // set it before a fresh dynamic import.
  async function loadEmailModule() {
    return import('./email.js');
  }

  describe('sendEmail', () => {
    it('skips sending when BREVO_API_KEY is not set', async () => {
      delete process.env.BREVO_API_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { sendEmail } = await loadEmailModule();

      await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' });

      expect(fetchMock).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('sends via the Brevo API when BREVO_API_KEY is set', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messageId: '1' }) });
      const { sendEmail } = await loadEmailModule();

      await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'api-key': 'test-key' }),
        })
      );
    });

    it('throws when the Brevo API responds with an error', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: false, text: async () => 'bad request' });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { sendEmail } = await loadEmailModule();

      await expect(
        sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>hi</p>' })
      ).rejects.toThrow('Failed to send email');

      errorSpy.mockRestore();
    });
  });

  describe('getAppUrl', () => {
    it('defaults to localhost when BETTER_AUTH_URL is unset', async () => {
      delete process.env.BETTER_AUTH_URL;
      const { getAppUrl } = await loadEmailModule();

      expect(getAppUrl()).toBe('http://localhost:4040');
    });

    it('uses BETTER_AUTH_URL when set', async () => {
      process.env.BETTER_AUTH_URL = 'https://api.example.com';
      const { getAppUrl } = await loadEmailModule();

      expect(getAppUrl()).toBe('https://api.example.com');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('rejects a non-http(s) reset URL', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      const { sendPasswordResetEmail } = await loadEmailModule();

      await expect(
        sendPasswordResetEmail({ to: 'a@example.com', name: 'A', resetUrl: 'javascript:alert(1)' })
      ).rejects.toThrow('Invalid reset URL');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends with the sanitized reset URL embedded in the email body', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const { sendPasswordResetEmail } = await loadEmailModule();

      await sendPasswordResetEmail({
        to: 'a@example.com',
        name: 'Alice',
        resetUrl: 'https://app.example.com/reset?token=abc',
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.htmlContent).toContain('https://app.example.com/reset?token=abc');
      expect(body.subject).toBe('Reset Your Password');
    });
  });

  describe('sendTripInvitationEmail', () => {
    it('rejects a malformed invite URL', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      const { sendTripInvitationEmail } = await loadEmailModule();

      await expect(
        sendTripInvitationEmail({
          to: 'a@example.com',
          inviterName: 'Bob',
          tripName: 'Bali',
          inviteUrl: 'not-a-url',
        })
      ).rejects.toThrow('Invalid invitation URL');
    });

    it('sends with the trip name in the subject and invite URL in the body', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const { sendTripInvitationEmail } = await loadEmailModule();

      await sendTripInvitationEmail({
        to: 'a@example.com',
        inviterName: 'Bob',
        tripName: 'Bali Trip',
        inviteUrl: 'https://app.example.com/join/abc',
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.subject).toBe('You\'ve been invited to join "Bali Trip"');
      expect(body.htmlContent).toContain('https://app.example.com/join/abc');
      expect(body.htmlContent).toContain('Bob');
      expect(body.htmlContent).toContain('Bali Trip');
    });

    it('escapes HTML-significant characters in the trip and inviter names', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const { sendTripInvitationEmail } = await loadEmailModule();

      await sendTripInvitationEmail({
        to: 'a@example.com',
        inviterName: '<script>alert(1)</script>',
        tripName: 'Bali',
        inviteUrl: 'https://app.example.com/join/abc',
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.htmlContent).not.toContain('<script>alert(1)</script>');
    });
  });

  describe('sendTripAddedNotification', () => {
    it('rejects a malformed trip URL', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      const { sendTripAddedNotification } = await loadEmailModule();

      await expect(
        sendTripAddedNotification({
          to: 'a@example.com',
          name: 'A',
          inviterName: 'Bob',
          tripName: 'Bali',
          tripUrl: 'ftp://bad.example.com',
        })
      ).rejects.toThrow('Invalid trip URL');
    });

    it('sends with the trip URL in the body and trip name in the subject', async () => {
      process.env.BREVO_API_KEY = 'test-key';
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const { sendTripAddedNotification } = await loadEmailModule();

      await sendTripAddedNotification({
        to: 'a@example.com',
        name: null,
        inviterName: 'Bob',
        tripName: 'Bali',
        tripUrl: 'https://app.example.com/trip/1',
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.subject).toBe('You\'ve been added to "Bali"');
      expect(body.htmlContent).toContain('https://app.example.com/trip/1');
    });
  });
});
