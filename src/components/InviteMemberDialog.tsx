import { useState } from 'react';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string) => Promise<void>;
}

export default function InviteMemberDialog({ open, onOpenChange, onInvite }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onInvite(email.trim());
      setSuccess('Invitation sent successfully!');
      setEmail('');
      setTimeout(() => {
        onOpenChange(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
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
            Invite Collaborator
          </DialogTitle>
          <DialogDescription>
            Invite another user to collaborate on this trip. They will be able to add and edit
            expenses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!email.trim() || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
