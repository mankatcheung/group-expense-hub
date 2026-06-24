'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTripDetail } from '@/hooks/use-trip-detail';
import { useNavigationProgress } from '@/context/NavigationProgressContext';
import { calculateBalances } from '@group-expense-hub/db/balances';
import ExpenseList from '@/components/ExpenseList';
import BalanceSummary from '@/components/BalanceSummary';
import MemberManager from '@/components/MemberManager';
import InviteMemberDialog from '@/components/InviteMemberDialog';
import Header from '@/components/Header';
import { PageSkeleton } from '@/components/Skeletons';
import { Plane, Plus, ArrowLeft, Users, UserMinus, Crown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function TripDetailContent() {
  const t = useTranslations('trip');
  const params = useParams();
  const router = useRouter();
  const { navigate } = useNavigationProgress();
  const searchParams = useSearchParams();
  const tripId = params.tripId as string;
  const {
    trip,
    isLoading,
    error,
    removeExpense,
    updateExpense,
    addMember,
    updateMember,
    updateTrip,
    removeMember,
    inviteMember,
    removeCollaborator,
    refreshTrip,
  } = useTripDetail(tripId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tripName, setTripName] = useState('');

  const currentTab = searchParams.get('tab') || 'summary';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`);
  };

  const handleStartEditName = () => {
    if (trip) {
      setTripName(trip.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (trip && tripName.trim()) {
      updateTrip(tripName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton onBack={() => navigate('/')} />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
            <p className="text-destructive text-sm font-medium mb-1">{t('failedToLoadTrip')}</p>
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

  const balances = calculateBalances(trip.expenses);

  const handleInvite = async (email: string) => {
    await inviteMember(email);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton onBack={() => navigate('/')} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('allTrips')}
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          {isEditingName ? (
            <div className="flex items-center justify-center gap-2">
              <Input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleSaveName}
                className="text-center max-w-[200px] font-display font-bold text-2xl"
                autoFocus
              />
            </div>
          ) : (
            <h1
              className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleStartEditName}
              title={t('clickToEdit')}
            >
              {trip.name}
            </h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {t('memberExpenseSummary', {
              memberCount: trip.members.length,
              expenseCount: trip.expenses?.length ?? 0,
            })}
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              {t('summaryTab')}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              {t('membersTab')}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">
              {t('expensesTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {trip.expenses?.length > 0 ? (
                <BalanceSummary balances={balances} members={trip.members} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noExpensesHint')}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('collaborators')}
                </h3>
                {trip.isOwner && (
                  <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('invite')}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={trip.owner?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {trip.owner?.name?.[0] || trip.owner?.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {trip.owner?.name || trip.owner?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('owner')}</p>
                </div>
                <Crown className="h-4 w-4 text-yellow-500" />
              </div>

              {trip.tripMembers?.length > 0 ? (
                trip.tripMembers?.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user.name?.[0] || member.user.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('collaborator')}</p>
                    </div>
                    {trip.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCollaborator(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {trip.isOwner ? t('noCollaboratorsOwnerHint') : t('noCollaboratorsHint')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <MemberManager
                members={trip.members}
                tripId={trip.id}
                onAdd={(m) => addMember(m)}
                onUpdate={(memberId, name) => updateMember(memberId, name)}
                onRemove={(id) => removeMember(id)}
              />
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Button onClick={() => navigate(`/trip/${trip.id}/add`)} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {t('addExpense')}
            </Button>
            <ExpenseList
              expenses={trip.expenses}
              members={trip.members}
              onRemove={(expenseId) => removeExpense(expenseId)}
              onUpdate={(expense) => updateExpense(expense)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={handleInvite} />
    </div>
  );
}

export default function TripDetailPage() {
  const t = useTranslations('common');
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">{t('loading')}</div>}
    >
      <TripDetailContent />
    </Suspense>
  );
}
