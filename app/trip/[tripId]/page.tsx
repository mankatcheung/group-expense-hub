"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTrip } from "@/context/TripContext";
import { calculateBalances } from "@/lib/balances";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import MemberManager from "@/components/MemberManager";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import Header from "@/components/Header";
import { Plane, Plus, ArrowLeft, Users, UserMinus, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

function TripDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.tripId as string;
  const {
    getTrip,
    isLoading,
    error,
    removeExpense,
    updateExpense,
    addMember,
    updateMember,
    removeMember,
    inviteMember,
    removeCollaborator,
    refreshTrips,
  } = useTrip();

  const [inviteOpen, setInviteOpen] = useState(false);

  const currentTab = searchParams.get("tab") || "summary";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`);
  };

  const trip = getTrip(tripId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton onBack={() => router.push("/")} />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="mb-6">
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="mb-8 text-center space-y-4">
            <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mb-6" />
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header showBackButton onBack={() => router.push("/")} />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
            <p className="text-destructive text-sm font-medium mb-1">Failed to load trip</p>
            <p className="text-muted-foreground text-xs mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={refreshTrips}>
                Try Again
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                Go Home
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
          <p className="text-muted-foreground mb-4">Trip not found</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const balances = calculateBalances(trip.expenses);

  const handleInvite = async (email: string) => {
    await inviteMember(trip.id, email);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton onBack={() => router.push("/")} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All Trips
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.members.length} member{trip.members.length !== 1 ? "s" : ""} ·{" "}
            {trip.expenses?.length} expense
            {trip.expenses?.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              Members
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {trip.expenses?.length > 0 ? (
                <BalanceSummary balances={balances} members={trip.members} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expenses yet. Add members and expenses to see the summary.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Collaborators
                </h3>
                {trip.isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInviteOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={trip.owner?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {trip.owner?.name?.[0] || trip.owner?.email?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {trip.owner?.name || trip.owner?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
                <Crown className="h-4 w-4 text-yellow-500" />
              </div>

              {trip.tripMembers?.length > 0 ? (
                trip.tripMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user.name?.[0] || member.user.email?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Collaborator
                      </p>
                    </div>
                    {trip.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCollaborator(trip.id, member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {trip.isOwner
                    ? "No collaborators yet. Invite others to join!"
                    : "No collaborators on this trip."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <MemberManager
                members={trip.members}
                tripId={trip.id}
                onAdd={(m) => addMember(trip.id, m)}
                onUpdate={(memberId, name) => updateMember(trip.id, memberId, name)}
                onRemove={(id) => removeMember(trip.id, id)}
              />
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Button
              onClick={() => router.push(`/trip/${trip.id}/add`)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
            <ExpenseList
              expenses={trip.expenses}
              members={trip.members}
              onRemove={(expenseId) => removeExpense(trip.id, expenseId)}
              onUpdate={(expense) => updateExpense(trip.id, expense)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
      />
    </div>
  );
}

export default function TripDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <TripDetailContent />
    </Suspense>
  );
}
