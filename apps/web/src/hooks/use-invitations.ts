import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, TripInvitation } from '@/services/api';
import { useTrip } from '@/context/TripContext';
import { handleApiError } from '@/lib/error-handler';

/**
 * Encapsulates the home page's invitations tab and join-by-link flow:
 * loading pending invitations, accepting one, and joining a trip via the
 * `?token=` query param dropped in from an invite link. Kept separate from
 * the trip-list rendering concern in app/page.tsx.
 */
export function useInvitations() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshTrips } = useTrip();

  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isJoiningTrip, setIsJoiningTrip] = useState(false);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const data = await api.getInvitations();
      setInvitations(data);
    } catch (err) {
      handleApiError(err, 'Failed to load invitations');
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  const handleJoinByToken = useCallback(
    async (token: string) => {
      setIsJoiningTrip(true);
      try {
        const result = await api.joinTrip(token);
        refreshTrips();
        router.push(`/trip/${result.tripId}`);
      } catch (err) {
        handleApiError(err, 'Failed to join trip');
        setIsJoiningTrip(false);
      }
    },
    [refreshTrips, router]
  );

  const handleAccept = useCallback(
    async (id: string) => {
      setAcceptingId(id);
      try {
        const result = await api.acceptInvitation(id);
        refreshTrips();
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        router.push(`/trip/${result.tripId}`);
      } catch (err) {
        handleApiError(err, 'Failed to accept invitation');
      } finally {
        setAcceptingId(null);
      }
    },
    [refreshTrips, router]
  );

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleJoinByToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    invitations,
    loadingInvitations,
    acceptingId,
    isJoiningTrip,
    handleAccept,
  };
}
