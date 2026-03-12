-- Add indices for improved query performance
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Verification_userId_idx" ON "Verification"("userId");
CREATE INDEX IF NOT EXISTS "Trip_userId_idx" ON "Trip"("userId");
CREATE INDEX IF NOT EXISTS "TripMember_tripId_idx" ON "TripMember"("tripId");
CREATE INDEX IF NOT EXISTS "TripMember_userId_idx" ON "TripMember"("userId");
CREATE INDEX IF NOT EXISTS "TripInvitation_tripId_idx" ON "TripInvitation"("tripId");
CREATE INDEX IF NOT EXISTS "TripInvitation_userId_idx" ON "TripInvitation"("userId");
CREATE INDEX IF NOT EXISTS "Member_tripId_idx" ON "Member"("tripId");
CREATE INDEX IF NOT EXISTS "Expense_tripId_idx" ON "Expense"("tripId");
CREATE INDEX IF NOT EXISTS "Expense_paidById_idx" ON "Expense"("paidById");
