import { describe, it, expect } from 'vitest';
import type { Expense, Balance } from '@group-expense-hub/db/types';

function calculateBalances(expenses: Expense[]): Balance[] {
  const byCurrency: Record<string, Expense[]> = {};
  for (const e of expenses) {
    (byCurrency[e.currency] ??= []).push(e);
  }

  const allBalances: Balance[] = [];

  for (const [currency, exps] of Object.entries(byCurrency)) {
    const net: Record<string, number> = {};

    for (const e of exps) {
      const share = e.amount / e.splitAmong.length;
      net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
      for (const id of e.splitAmong) {
        net[id] = (net[id] ?? 0) - share;
      }
    }

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

describe('calculateBalances', () => {
  it('should return empty array for no expenses', () => {
    const result = calculateBalances([]);
    expect(result).toEqual([]);
  });

  it('should calculate single expense split equally', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        description: 'Dinner',
        amount: 90,
        currency: 'USD',
        paidBy: 'alice',
        splitAmong: ['alice', 'bob', 'charlie'],
        date: '2024-01-01',
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      from: 'bob',
      to: 'alice',
      amount: 30,
      currency: 'USD',
    });
    expect(result).toContainEqual({
      from: 'charlie',
      to: 'alice',
      amount: 30,
      currency: 'USD',
    });
  });

  it('should handle payer in split', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        description: 'Dinner',
        amount: 60,
        currency: 'USD',
        paidBy: 'alice',
        splitAmong: ['alice', 'bob'],
        date: '2024-01-01',
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from: 'bob',
      to: 'alice',
      amount: 30,
      currency: 'USD',
    });
  });

  it('should handle multiple expenses', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        description: 'Dinner',
        amount: 50,
        currency: 'USD',
        paidBy: 'alice',
        splitAmong: ['alice', 'bob'],
        date: '2024-01-01',
      },
      {
        id: '2',
        description: 'Movie',
        amount: 20,
        currency: 'USD',
        paidBy: 'bob',
        splitAmong: ['alice', 'bob'],
        date: '2024-01-02',
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      from: 'bob',
      to: 'alice',
      amount: 15,
      currency: 'USD',
    });
  });

  it('should handle multiple currencies separately', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        paidBy: 'alice',
        splitAmong: ['alice', 'bob'],
        date: '2024-01-01',
      },
      {
        id: '2',
        description: 'Lunch',
        amount: 50,
        currency: 'EUR',
        paidBy: 'bob',
        splitAmong: ['alice', 'bob'],
        date: '2024-01-02',
      },
    ];

    const result = calculateBalances(expenses);

    const usdBalances = result.filter((b) => b.currency === 'USD');
    const eurBalances = result.filter((b) => b.currency === 'EUR');

    expect(usdBalances).toHaveLength(1);
    expect(eurBalances).toHaveLength(1);
    expect(usdBalances[0].amount).toBe(50);
    expect(eurBalances[0].amount).toBe(25);
  });

  it('should handle uneven splits', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        description: 'Bill',
        amount: 100,
        currency: 'USD',
        paidBy: 'alice',
        splitAmong: ['alice', 'bob', 'charlie'],
        date: '2024-01-01',
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toHaveLength(2);
    result.forEach((balance) => {
      expect(balance.amount).toBeCloseTo(33.33, 2);
    });
  });
});
