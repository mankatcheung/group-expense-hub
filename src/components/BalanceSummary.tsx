import { Member } from "@/lib/types";
import { Balance } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currencies";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  balances: Balance[];
  members: Member[];
}

export default function BalanceSummary({ balances, members }: Props) {
  const getMember = (id: string) => members.find((m) => m.id === id);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground">Who Owes Who</h2>
      {balances.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-3" />
          <p className="text-sm text-muted-foreground">All settled up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((b, i) => {
            const from = getMember(b.from);
            const to = getMember(b.to);
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span
                  className="font-medium text-sm"
                  style={{ color: from?.color }}
                >
                  {from?.name}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <span
                  className="font-medium text-sm"
                  style={{ color: to?.color }}
                >
                  {to?.name}
                </span>
                <span className="ml-auto font-semibold text-sm">
                  {getCurrencySymbol(b.currency)}{b.amount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
