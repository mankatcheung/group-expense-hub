import { NextResponse, type NextRequest } from 'next/server';
import { CreateExpenseRequestSchema, UpdateExpenseRequestSchema } from '@group-expense-hub/db/schemas';
import type { IAuthService } from '../../application/ports/services/auth.service';
import type { IRateLimitService } from '../../application/ports/services/rate-limit.service';
import type { CreateExpenseUseCase } from '../../application/use-cases/expenses/create-expense.use-case';
import type { UpdateExpenseUseCase } from '../../application/use-cases/expenses/update-expense.use-case';
import type { DeleteExpenseUseCase } from '../../application/use-cases/expenses/delete-expense.use-case';
import { parseBody } from '../../http/validate-request';
import { badRequest, jsonError, rateLimit, readJsonBody, requireAuth, type RouteContext } from '../../http/route-helpers';

export type ExpenseRouteDeps = {
  authService: IAuthService;
  createExpense: CreateExpenseUseCase;
  updateExpense: UpdateExpenseUseCase;
  deleteExpense: DeleteExpenseUseCase;
  apiRateLimiter: IRateLimitService;
};

type TripParams = { id: string };
type ExpenseParams = { id: string; expenseId: string };

const FORBIDDEN = 'Not authorized to edit this trip';

export function createExpenseRoutes(deps: ExpenseRouteDeps) {
  return {
    async create(request: NextRequest, { params }: RouteContext<TripParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId } = await params;
      const body = parseBody(CreateExpenseRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.createExpense(tripId, body.data, user.id);
      if (result.type === 'error') return jsonError(403, FORBIDDEN);
      return NextResponse.json({ success: true });
    },

    async update(request: NextRequest, { params }: RouteContext<ExpenseParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId, expenseId } = await params;
      const body = parseBody(UpdateExpenseRequestSchema, await readJsonBody(request));
      if (!body.ok) return badRequest(body.message);

      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.updateExpense(tripId, expenseId, body.data, user.id);
      if (result.type === 'error') {
        return result.reason === 'forbidden' ? jsonError(403, FORBIDDEN) : jsonError(404, 'Expense not found');
      }
      return NextResponse.json({ success: true });
    },

    async remove(request: NextRequest, { params }: RouteContext<ExpenseParams>): Promise<Response> {
      const user = await requireAuth(request, deps.authService);
      if (user instanceof Response) return user;

      const { id: tripId, expenseId } = await params;
      const limited = await rateLimit(deps.apiRateLimiter, user.id);
      if (limited) return limited;

      const result = await deps.deleteExpense(tripId, expenseId, user.id);
      if (result.type === 'error') {
        return result.reason === 'forbidden' ? jsonError(403, FORBIDDEN) : jsonError(404, 'Expense not found');
      }
      return NextResponse.json({ success: true });
    },
  };
}
