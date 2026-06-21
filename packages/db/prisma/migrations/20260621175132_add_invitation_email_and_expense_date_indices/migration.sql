-- Add index for invitation lookups by email and date-ordered expense listing per trip
CREATE INDEX IF NOT EXISTS "TripInvitation_email_idx" ON "TripInvitation"("email");
CREATE INDEX IF NOT EXISTS "Expense_tripId_date_idx" ON "Expense"("tripId", "date");
