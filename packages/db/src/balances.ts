import type { Expense, Balance } from './types';

export function calculateBalances(expenses: Expense[]): Balance[] {
  // Group by currency
  const byCurrency: Record<string, Expense[]> = {};
  for (const e of expenses) {
    (byCurrency[e.currency] ??= []).push(e);
  }

  const allBalances: Balance[] = [];

  for (const [currency, exps] of Object.entries(byCurrency)) {
    // net[memberId] = how much they are owed (positive) or owe (negative)
    const net: Record<string, number> = {};

    for (const e of exps) {
      const share = e.amount / e.splitAmong.length;
      net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
      for (const id of e.splitAmong) {
        net[id] = (net[id] ?? 0) - share;
      }
    }

    // Simplify debts
    const creditors: { id: string; amount: number }[] = [];
    const debtors: { id: string; amount: number }[] = [];

    for (const [id, amount] of Object.entries(net)) {
      const rounded = Math.round(amount * 100) / 100;
      if (rounded > 0.01) creditors.push({ id, amount: rounded });
      else if (rounded < -0.01) debtors.push({ id, amount: -rounded });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      if (!debtor || !creditor) break;

      const transfer = Math.min(debtor.amount, creditor.amount);
      if (transfer > 0.01) {
        allBalances.push({
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(transfer * 100) / 100,
          currency,
        });
      }
      debtors[i]!.amount -= transfer;
      creditors[j]!.amount -= transfer;
      if (debtors[i]!.amount < 0.01) i++;
      if (creditors[j]!.amount < 0.01) j++;
    }
  }

  return allBalances;
}
