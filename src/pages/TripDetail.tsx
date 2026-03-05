import { useParams, useNavigate } from "react-router-dom";
import { useTrip } from "@/context/TripContext";
import { calculateBalances } from "@/lib/balances";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import { Plane, Plus, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { getTrip, removeExpense, updateExpense } = useTrip();
  const navigate = useNavigate();

  const trip = getTrip(tripId!);

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Trip not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const balances = calculateBalances(trip.expenses);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            All Trips
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.members.length} member{trip.members.length !== 1 ? "s" : ""} · {trip.expenses.length} expense{trip.expenses.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Button onClick={() => navigate(`/trip/${trip.id}/add`)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>

          {/* Summary Section */}
          {trip.expenses.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <BalanceSummary balances={balances} members={trip.members} />
            </div>
          )}

          {/* Expense List Section */}
          <ExpenseList
            expenses={trip.expenses}
            members={trip.members}
            onRemove={(expenseId) => removeExpense(trip.id, expenseId)}
            onUpdate={(expense) => updateExpense(trip.id, expense)}
          />

          {/* Members Section */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-display font-semibold text-foreground">Members ({trip.members.length})</h2>
            </div>
            {trip.members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add members from the expense page.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trip.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-muted/30">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;
