'use client';

export const dynamic = 'force-dynamic';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane, Loader2 } from 'lucide-react';
import { handleApiError } from '@/lib/error-handler';

const emailSchema = z.string().email();

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailTaken, setEmailTaken] = useState(false);
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  if (!isLoading && isAuthenticated) {
    router.replace('/');
    return null;
  }

  const handleEmailBlur = async () => {
    setEmailTaken(false);
    // Only a fast, non-blocking hint - skip on partial/invalid input rather
    // than firing a request that'll just 400.
    if (!emailSchema.safeParse(email).success) return;

    try {
      const { available } = await api.checkEmailAvailable(email);
      setEmailTaken(!available);
    } catch {
      // Purely informational; if the check itself fails, say nothing and
      // let the real sign-up call be the source of truth as usual.
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    startTransition(async () => {
      try {
        await register(name, email, password);
        router.push('/');
      } catch (err) {
        handleApiError(err, t('registerFailed'));
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('createAccount')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('registerHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder={t('fullNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTaken(false);
              }}
              onBlur={handleEmailBlur}
              disabled={isSubmitting}
              required
            />
            {emailTaken && <p className="text-xs text-destructive">{t('emailTaken')}</p>}
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t('confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creatingAccount')}
              </>
            ) : (
              t('signUp')
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
