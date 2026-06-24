'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import { handleApiError } from '@/lib/error-handler';

function ResetPasswordContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (!token) {
      setError(t('invalidResetToken'));
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        token,
        newPassword: password,
      });

      if (authError) {
        setError(authError.message || t('resetPasswordFailed'));
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      handleApiError(err, t('resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Plane className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('invalidLink')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('invalidLinkHint')}</p>
          </div>

          <div className="text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              {t('requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Plane className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('passwordResetHeading')}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t('passwordResetSuccessHint')}</p>
          </div>

          <div className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('goToSignIn')}
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
          <p className="text-sm text-muted-foreground mt-2">{t('newPasswordHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t('newPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t('confirmNewPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('resetting') : t('resetPasswordButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('common');
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">{t('loading')}</div>}
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
