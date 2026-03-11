'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

function ResetPasswordContent() {
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
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        token,
        newPassword: password,
      });

      if (authError) {
        setError(authError.message || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
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
            <h2 className="text-2xl font-bold tracking-tight">Invalid Link</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Request a new reset link
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
            <h2 className="text-2xl font-bold tracking-tight">Password Reset</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your password has been reset. Redirecting to login...
            </p>
          </div>

          <div className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Go to sign in
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
          <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
          <p className="text-sm text-muted-foreground mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
