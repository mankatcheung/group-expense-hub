'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Plane, Settings, Sun, Moon, User, Loader2, Languages } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTheme } from 'next-themes';
import { handleApiError } from '@/lib/error-handler';
import { useNavigationProgress } from '@/context/NavigationProgressContext';

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ showBackButton, onBack }: HeaderProps) {
  const t = useTranslations('common');
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { navigate } = useNavigationProgress();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      handleApiError(err, t('logoutFailed'));
      setIsLoggingOut(false);
    }
  };

  const handleSwitchLocale = () => {
    const nextLocale = locale === 'en' ? 'zh-HK' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground"
              aria-label={t('goBack')}
            >
              <span aria-hidden="true">←</span>
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">{t('hello', { name: user?.name ?? '' })}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-label={t('userMenu')}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <User className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">{t('userMenu')}</span>
              {isLoggingOut ? t('signingOut') : user?.name || user?.email?.split('@')[0]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  {t('lightMode')}
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  {t('darkMode')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchLocale}>
              <Languages className="mr-2 h-4 w-4" />
              {locale === 'en' ? t('switchToChinese') : t('switchToEnglish')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
