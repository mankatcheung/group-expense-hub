import { useTrip } from "@/context/TripContext";
import MemberManager from "@/components/MemberManager";
import AddExpense from "@/components/AddExpense";
import { Plane, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AddExpensePage = () => {
  const { members, addMember, removeMember, addExpense } = useTrip();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Summary
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            Add Expense
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add members and log new expenses
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <MemberManager members={members} onAdd={addMember} onRemove={removeMember} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <AddExpense members={members} onAdd={addExpense} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpensePage;
