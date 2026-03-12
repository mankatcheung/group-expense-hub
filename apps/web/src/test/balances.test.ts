import { describe, it, expect } from 'vitest';
import { calculateBalances } from '@/lib/balances';
import type { Expense } from '@/lib/types';

describe('balances', () => {
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
});
