import { useTrip } from "@/context/TripContext";
import { calculateBalances } from "@/lib/balances";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import { Plane, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { members, expenses, removeExpense } = useTrip();
  const navigate = useNavigate();
  const balances = calculateBalances(expenses);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            SplitTrip
          </h1>
          <p className="mt-2 text-muted-foreground">
            Split expenses with friends, no awkward math needed
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Button onClick={() => navigate("/add")} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>

          {expenses.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <BalanceSummary balances={balances} members={members} />
            </div>
          )}

          <ExpenseList expenses={expenses} members={members} onRemove={removeExpense} />
        </div>
      </div>
    </div>
  );
};

export default Index;
