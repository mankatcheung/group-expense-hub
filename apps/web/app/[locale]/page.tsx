'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useTrip } from '@/context/TripContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNavigationProgress } from '@/context/NavigationProgressContext';
import { useInvitations } from '@/hooks/use-invitations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { TripCardSkeleton, InvitationSkeleton } from '@/components/Skeletons';
import {
  Plus,
  Trash2,
  ChevronRight,
  MapPin,
  Mail,
  Check,
  Loader2,
  Plane,
  AlertCircle,
} from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';

function IndexContent() {
  const t = useTranslations('home');
  const { trips, isLoading, error, createTrip, deleteTrip, refreshTrips } = useTrip();
  const router = useRouter();
  const { navigate } = useNavigationProgress();
  const searchParams = useSearchParams();
  const [tripName, setTripName] = useState('');
  const { invitations, loadingInvitations, acceptingId, isJoiningTrip, handleAccept } =
    useInvitations();

  const currentTab = searchParams.get('tab') || 'trips';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`);
  };

  const handleCreate = () => {
    const name = tripName.trim();
    if (!name) return;
    const trip = createTrip(name);
    setTripName('');
    navigate(`/trip/${trip.id}`);
  };

  if (isJoiningTrip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('joiningTrip')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            SplitTrip
          </h1>
          <p className="mt-2 text-muted-foreground">{t('tagline')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">
            {t('newTrip')}
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder={t('tripNamePlaceholder')}
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              {t('create')}
            </Button>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="trips" className="flex-1">
              {t('tripsTab')}
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex-1">
              {t('invitationsTab')}
              {invitations.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {invitations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <TripCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
                <p className="text-destructive text-sm font-medium mb-1">
                  {t('failedToLoadTrips')}
                </p>
                <p className="text-muted-foreground text-xs mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={refreshTrips}>
                  {t('tryAgain')}
                </Button>
              </div>
            ) : trips.length > 0 ? (
              <div className="space-y-3">
                {trips.map((trip) => {
                  const totals = Object.entries(trip.totalsByCurrency);

                  return (
                    <div
                      key={trip.id}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{trip.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('memberExpenseSummary', {
                            memberCount: trip.memberCount,
                            expenseCount: trip.expenseCount,
                          })}
                          {totals.length > 0 && (
                            <span>
                              {' '}
                              ·{' '}
                              {totals
                                .map(([cur, amt]) => `${getCurrencySymbol(cur)}${amt.toFixed(0)}`)
                                .join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                      {trip.isOwner && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            deleteTrip(trip.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">{t('createFirstTripHint')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations">
            {loadingInvitations ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <InvitationSkeleton key={i} />
                ))}
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{inv.tripName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('invitedBy', {
                          name: inv.inviter?.name || inv.inviter?.email || t('unknownInviter'),
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(inv.id)}
                      disabled={acceptingId === inv.id}
                      className="gap-1"
                    >
                      {acceptingId === inv.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      {t('accept')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">{t('noPendingInvitations')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Home() {
  const t = useTranslations('common');
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">{t('loading')}</div>}
    >
      <IndexContent />
    </Suspense>
  );
}
