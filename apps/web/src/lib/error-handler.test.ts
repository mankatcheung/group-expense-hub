import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { handleApiError, handleApiSuccess } from './error-handler.js';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('handleApiError', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a rate-limit toast for "Too many requests" errors', () => {
    handleApiError(new Error('Too many requests, slow down'));

    expect(toast.error).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ description: expect.any(String) })
    );
  });

  it('shows a session-expired toast for "Unauthorized" errors', () => {
    handleApiError(new Error('Unauthorized'));

    expect(toast.error).toHaveBeenCalledWith(
      'Session expired',
      expect.objectContaining({ description: expect.any(String) })
    );
  });

  it('shows a permission-denied toast for "Not authorized" errors, including the message', () => {
    handleApiError(new Error('Not authorized to edit this trip'));

    expect(toast.error).toHaveBeenCalledWith('Permission denied', {
      description: 'Not authorized to edit this trip',
    });
  });

  it('shows the fallback message with the error detail for other Error instances', () => {
    handleApiError(new Error('Something specific broke'), 'Failed to load trips');

    expect(toast.error).toHaveBeenCalledWith('Failed to load trips', {
      description: 'Something specific broke',
    });
  });

  it('uses the default fallback message when none is provided', () => {
    handleApiError(new Error('Boom'));

    expect(toast.error).toHaveBeenCalledWith('Something went wrong', { description: 'Boom' });
  });

  it('shows just the fallback message for non-Error values', () => {
    handleApiError('a string error', 'Failed to do the thing');

    expect(toast.error).toHaveBeenCalledWith('Failed to do the thing');
  });

  it('logs the raw error to the console', () => {
    const error = new Error('Boom');
    handleApiError(error);

    expect(console.error).toHaveBeenCalledWith('API Error:', error);
  });
});

describe('handleApiSuccess', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a success toast with the message and optional description', () => {
    handleApiSuccess('Saved', 'Your changes were saved');

    expect(toast.success).toHaveBeenCalledWith('Saved', { description: 'Your changes were saved' });
  });

  it('shows a success toast with no description', () => {
    handleApiSuccess('Saved');

    expect(toast.success).toHaveBeenCalledWith('Saved', { description: undefined });
  });
});
