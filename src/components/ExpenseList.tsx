import { Expense, Member } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { Trash2 } from "lucide-react";

interface Props {
  expenses: Expense[];
  members: Member[];
  onRemove: (id: string) => void;
}

export default function ExpenseList({ expenses, members, onRemove }: Props) {
  const getMember = (id: string) => members.find((m) => m.id === id);

  if (expenses.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground">
        Expenses ({expenses.length})
      </h2>
      <div className="space-y-2">
        {expenses.map((e) => {
          const payer = getMember(e.paidBy);
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 group transition-colors hover:bg-muted/50"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{
                  backgroundColor: (payer?.color ?? "hsl(var(--primary))") + "18",
                  color: payer?.color ?? "hsl(var(--primary))",
                }}
              >
                {getCurrencySymbol(e.currency)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  <span style={{ color: payer?.color }}>{payer?.name}</span> paid · split {e.splitAmong.length} way{e.splitAmong.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">
                  {getCurrencySymbol(e.currency)}{e.amount.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => onRemove(e.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
