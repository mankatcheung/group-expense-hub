import { z } from "zod";

export const uuidParam = z.string().uuid();
export const emailBody = z.object({ email: z.string().email() });
export const tripBody = z.object({
  id: uuidParam,
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime().optional(),
});
export const memberBody = z.object({
  id: uuidParam,
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export const expenseBody = z.object({
  id: uuidParam,
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidBy: z.string().uuid(),
  splitAmong: z.array(z.string().uuid()).min(1),
  date: z.string().datetime().optional(),
});
export const updateExpenseBody = expenseBody.partial({ id: true });
export const joinBody = z.object({ token: z.string().uuid() });
