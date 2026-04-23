-- Track the active card on file. One card per user, shared
-- across the base subscription and every addon. Updating
-- means atomically replacing all three fields + calling
-- subscriptions.update on every sub (see /api/payments/update-
-- card for the rollback flow).
ALTER TABLE "User"
  ADD COLUMN "squareCardId"    TEXT,
  ADD COLUMN "squareCardBrand" TEXT,
  ADD COLUMN "squareCardLast4" TEXT;
