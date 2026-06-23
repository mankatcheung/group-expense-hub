import { toast } from 'sonner';
import { createTranslator } from 'next-intl';
import enMessages from '../../messages/en.json';
import zhHKMessages from '../../messages/zh-HK.json';

export interface ApiError {
  message?: string;
  code?: string;
}

const messagesByLocale = { en: enMessages, 'zh-HK': zhHKMessages };

/**
 * Called from plain event handlers (not React render), so it can't use the
 * useTranslations hook - reads the locale directly from the URL instead
 * (this app's routing is always locale-prefixed) and builds a one-off
 * translator for the small set of error strings this module owns.
 */
function getErrorTranslator() {
  const locale = typeof window !== 'undefined' && window.location.pathname.startsWith('/zh-HK')
    ? 'zh-HK'
    : 'en';
  return createTranslator({ locale, messages: messagesByLocale[locale], namespace: 'errors' });
}

export function handleApiError(error: unknown, fallbackMessage?: string) {
  console.error('API Error:', error);
  const t = getErrorTranslator();
  const fallback = fallbackMessage ?? t('somethingWentWrong');

  if (error instanceof Error) {
    if (error.message.includes('Too many requests')) {
      toast.error(t('rateLimitExceeded'), {
        description: t('rateLimitExceededDescription'),
      });
      return;
    }

    if (error.message.includes('Unauthorized')) {
      toast.error(t('sessionExpired'), {
        description: t('sessionExpiredDescription'),
      });
      return;
    }

    if (error.message.includes('Not authorized')) {
      toast.error(t('permissionDenied'), {
        description: error.message,
      });
      return;
    }

    toast.error(fallback, {
      description: error.message,
    });
    return;
  }

  toast.error(fallback);
}

export function handleApiSuccess(message: string, description?: string) {
  toast.success(message, { description });
}
