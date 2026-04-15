-- Idempotent backfill for the reveal-tracking columns.
--
-- The original migration (20260415080000_capsule_recipient_completed_at)
-- is marked applied in _prisma_migrations on the production DB, but the
-- underlying column is missing — classic state drift (migrations table
-- got ahead of schema, most likely from an earlier reset that left the
-- migrations table intact). `IF NOT EXISTS` makes this safe to run
-- wherever we land — adds the column only where it's really missing,
-- no-op otherwise.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN IF NOT EXISTS "recipientCompletedAt" TIMESTAMP(3);
