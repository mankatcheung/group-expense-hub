"use client";

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from "next/navigation";
import { useTrip } from "@/context/TripContext";
import AddExpense from "@/components/AddExpense";
import Header from "@/components/Header";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { getTrip, addExpense } = useTrip();

  const trip = getTrip(tripId);

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Trip not found</p>
          <Button variant="outline" onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showBackButton onBack={() => router.push(`/trip/${trip.id}`)} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add members and log expenses
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <AddExpense members={trip.members} onAdd={(e) => addExpense(trip.id, e)} />
          </div>
        </div>
      </div>
    </div>
  );
}
