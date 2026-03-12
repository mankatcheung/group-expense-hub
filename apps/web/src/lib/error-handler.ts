import { toast } from 'sonner';

export interface ApiError {
  message?: string;
  code?: string;
}

export function handleApiError(error: unknown, fallbackMessage = 'Something went wrong') {
  console.error('API Error:', error);

  if (error instanceof Error) {
    if (error.message.includes('Too many requests')) {
      toast.error('Rate limit exceeded', {
        description: 'Please wait a moment before trying again.',
      });
      return;
    }

    if (error.message.includes('Unauthorized')) {
      toast.error('Session expired', {
        description: 'Please log in again.',
      });
      return;
    }

    if (error.message.includes('Not authorized')) {
      toast.error('Permission denied', {
        description: error.message,
      });
      return;
    }

    toast.error(fallbackMessage, {
      description: error.message,
    });
    return;
  }

  toast.error(fallbackMessage);
}

export function handleApiSuccess(message: string, description?: string) {
  toast.success(message, { description });
}
