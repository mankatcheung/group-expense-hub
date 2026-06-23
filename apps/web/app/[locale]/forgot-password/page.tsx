'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import { handleApiError } from '@/lib/error-handler';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  if (!isLoading && isAuthenticated) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email: email,
      });

      if (authError) {
        setError(authError.message || t('sendResetFailed'));
        return;
      }

      setSuccess(true);
    } catch (err) {
      handleApiError(err, t('sendResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Plane className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('checkEmail')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('resetEmailSentHint')}</p>
          </div>

          <div className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('resetPasswordHeading')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('resetPasswordHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('sending') : t('sendResetLink')}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            {t('rememberPassword')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
