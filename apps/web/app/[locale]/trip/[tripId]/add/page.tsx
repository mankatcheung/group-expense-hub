'use client';

export const dynamic = 'force-dynamic';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { useNavigationProgress } from '@/context/NavigationProgressContext';
import AddExpense from '@/components/AddExpense';
import Header from '@/components/Header';
import { FormSkeleton } from '@/components/Skeletons';
import { Plane, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddExpensePage() {
  const t = useTranslations('trip');
  const params = useParams();
  const { navigate } = useNavigationProgress();
  const tripId = params.tripId as string;
  const { trip, addExpense, isLoading, error, refreshTrip } = useTripDetail(tripId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton onBack={() => navigate(`/trip/${tripId}`)} />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl mx-auto bg-muted animate-pulse" />
            <div className="h-8 w-48 mx-auto rounded bg-muted animate-pulse" />
            <div className="h-4 w-40 mx-auto rounded bg-muted animate-pulse" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <FormSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton onBack={() => navigate(`/trip/${tripId}`)} />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
            <p className="text-destructive text-sm font-medium mb-1">
              {t('failedToLoadTripData')}
            </p>
            <p className="text-muted-foreground text-xs mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={refreshTrip}>
                {t('tryAgain')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                {t('goHome')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('tripNotFound')}</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            {t('goHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton onBack={() => navigate(`/trip/${trip.id}`)} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('addMembersAndLogHint')}</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <AddExpense members={trip.members} onAdd={(e) => addExpense(e)} />
          </div>
        </div>
      </div>
    </div>
  );
}
