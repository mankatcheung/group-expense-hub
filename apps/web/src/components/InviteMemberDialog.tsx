import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { handleApiError } from '@/lib/error-handler';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string) => Promise<void>;
}

export default function InviteMemberDialog({ open, onOpenChange, onInvite }: Props) {
  const t = useTranslations('trip');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleInvite = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onInvite(email.trim());
      setSuccess(t('invitationSent'));
      setEmail('');
      setTimeout(() => {
        onOpenChange(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      handleApiError(err, t('sendInvitationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail('');
      setError('');
      setSuccess('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('inviteCollaborator')}
          </DialogTitle>
          <DialogDescription>{t('inviteCollaboratorDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('emailAddressLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="email"
                placeholder={t('emailAddressPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="pl-10"
                disabled={loading}
                aria-label={t('emailAddressLabel')}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button onClick={handleInvite} disabled={!email.trim() || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                t('sendInvitation')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
