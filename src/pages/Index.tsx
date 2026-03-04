import { useState } from "react";
import { Member, Expense } from "@/lib/types";
import { calculateBalances } from "@/lib/balances";
import MemberManager from "@/components/MemberManager";
import AddExpense from "@/components/AddExpense";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import { Plane } from "lucide-react";

const Index = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const addMember = (m: Member) => setMembers((prev) => [...prev, m]);
  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setExpenses((prev) =>
      prev
        .filter((e) => e.paidBy !== id)
        .map((e) => ({ ...e, splitAmong: e.splitAmong.filter((x) => x !== id) }))
        .filter((e) => e.splitAmong.length > 0)
    );
  };
  const addExpense = (e: Expense) => setExpenses((prev) => [e, ...prev]);
  const removeExpense = (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id));

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
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <MemberManager members={members} onAdd={addMember} onRemove={removeMember} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <AddExpense members={members} onAdd={addExpense} />
          </div>

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
