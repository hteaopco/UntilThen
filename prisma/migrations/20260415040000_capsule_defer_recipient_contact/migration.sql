-- Capsule recipient contact is now deferred to the activation
-- step. Make the existing email column nullable and add a
-- parallel phone column (SMS reveal is a future Twilio TODO;
-- the column exists now so the UI can collect it at paywall).

ALTER TABLE "MemoryCapsule"
  ALTER COLUMN "recipientEmail" DROP NOT NULL;

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "recipientPhone" TEXT;
