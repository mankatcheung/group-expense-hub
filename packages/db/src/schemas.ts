import { z } from 'zod';

export const MemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidBy: z.string().uuid(),
  splitAmong: z.array(z.string().uuid()).min(1),
  date: z.string().datetime(),
});

export const BalanceSchema = z.object({
  from: z.string().uuid(),
  to: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});

export const TripUserSchema = z.object({
  id: z.string(),
  name: z.string().max(100).nullable(),
  email: z.string().email(),
  image: z.string().url().nullable(),
});

export const TripMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'collaborator', 'member']),
  user: TripUserSchema,
});

export const TripSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  members: z.array(MemberSchema),
  tripMembers: z.array(TripMemberSchema),
  expenses: z.array(ExpenseSchema),
  createdAt: z.string().datetime(),
  isOwner: z.boolean(),
  owner: TripUserSchema.nullable(),
});

export const TripsResponseSchema = z.array(TripSchema);

export const TripResponseSchema = TripSchema;

export const InviteMemberResponseSchema = z.object({
  success: z.boolean(),
  pending: z.boolean().optional(),
  message: z.string().optional(),
  user: TripUserSchema.optional(),
  member: MemberSchema.optional(),
});

export const RemoveMemberResponseSchema = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  expenseCount: z.number().optional(),
  memberName: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export const BalanceCalculationResponseSchema = z.object({
  balances: z.array(BalanceSchema),
});

export type Member = z.infer<typeof MemberSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type TripUser = z.infer<typeof TripUserSchema>;
export type TripMember = z.infer<typeof TripMemberSchema>;
export type Trip = z.infer<typeof TripSchema>;

export function validateTripsResponse(data: unknown): Trip[] {
  return TripsResponseSchema.parse(data);
}

export function validateTripResponse(data: unknown): Trip {
  return TripResponseSchema.parse(data);
}

export function validateInviteMemberResponse(data: unknown) {
  return InviteMemberResponseSchema.parse(data);
}

export function validateRemoveMemberResponse(data: unknown) {
  return RemoveMemberResponseSchema.parse(data);
}

export function validateBalanceCalculationResponse(data: unknown) {
  return BalanceCalculationResponseSchema.parse(data);
}

export function safeParseTripsResponse(data: unknown) {
  return TripsResponseSchema.safeParse(data);
}

export function safeParseTripResponse(data: unknown) {
  return TripResponseSchema.safeParse(data);
}

export function safeParseInviteMemberResponse(data: unknown) {
  return InviteMemberResponseSchema.safeParse(data);
}

export function safeParseRemoveMemberResponse(data: unknown) {
  return RemoveMemberResponseSchema.safeParse(data);
}

export function safeParseBalanceCalculationResponse(data: unknown) {
  return BalanceCalculationResponseSchema.safeParse(data);
}

// Request body schemas — distinct from the response schemas above since
// request payloads have different optionality (e.g. `date` defaults
// server-side) and omit server-computed fields.

export const CreateTripRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  createdAt: z.string().datetime().optional(),
});

export const UpdateTripRequestSchema = z.object({
  name: z.string().min(1).max(200),
});

export const CreateMemberRequestSchema = MemberSchema;

export const UpdateMemberRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const CreateExpenseRequestSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidBy: z.string().uuid(),
  splitAmong: z.array(z.string().uuid()).min(1),
  date: z.string().datetime().optional(),
});

export const UpdateExpenseRequestSchema = CreateExpenseRequestSchema;

export const InviteMemberRequestSchema = z.object({
  email: z.string().email(),
});

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const CheckEmailRequestSchema = z.object({
  email: z.string().email(),
});
