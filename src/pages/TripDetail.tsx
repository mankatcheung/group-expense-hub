import { useParams, useNavigate } from "react-router-dom";
import { useTrip } from "@/context/TripContext";
import { calculateBalances } from "@/lib/balances";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import MemberManager from "@/components/MemberManager";
import { Plane, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { getTrip, removeExpense, updateExpense, addMember, removeMember } = useTrip();
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

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
            <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              {trip.expenses.length > 0 ? (
                <BalanceSummary balances={balances} members={trip.members} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No expenses yet. Add members and expenses to see the summary.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <MemberManager
                members={trip.members}
                onAdd={(m) => addMember(trip.id, m)}
                onRemove={(id) => removeMember(trip.id, id)}
              />
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Button onClick={() => navigate(`/trip/${trip.id}/add`)} className="w-full gap-2">
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
    </div>
  );
};

export default TripDetail;
