'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/error-handler';
import { useNavigationProgress } from '@/context/NavigationProgressContext';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { user, refreshUser } = useAuth();
  const { goBack } = useNavigationProgress();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSave = async () => {
    setError('');
    setIsSaving(true);

    try {
      const updateData: { name?: string; email?: string } = {};
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (trimmedName) updateData.name = trimmedName;
      if (trimmedEmail) updateData.email = trimmedEmail;

      await api.updateUserProfile(updateData);
      await refreshUser();
      toast.success(t('profileUpdated'));
    } catch (err) {
      handleApiError(err, t('updateProfileFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('fillAllPasswordFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('newPasswordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('passwordTooShort'));
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('passwordChanged'));
    } catch (err) {
      handleApiError(err, t('changePasswordFailed'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const hasChanges = name !== (user?.name || '') || email !== (user?.email || '');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-8 space-y-6">
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="text-muted-foreground gap-1"
          >
            ← {tCommon('back')}
          </Button>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t('title')}</h1>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">{t('profile')}</h2>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {t('nameLabel')}
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('emailLabel')}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="w-full">
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">{t('changePassword')}</h2>
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              {t('currentPasswordLabel')}
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('currentPasswordPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              {t('newPasswordLabel')}
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder2')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmNewPasswordLabel')}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmNewPasswordPlaceholder2')}
            />
          </div>

          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}

          {passwordSuccess && <p className="text-sm text-green-600">{t('passwordChanged')}</p>}

          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full"
            variant="outline"
          >
            {isChangingPassword ? t('changing') : t('changePassword')}
          </Button>
        </div>
      </div>
    </div>
  );
}
