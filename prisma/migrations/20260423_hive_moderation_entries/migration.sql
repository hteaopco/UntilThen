-- Hive moderation columns on Entry — matches the shape we added
-- to CapsuleContribution in 20260423_hive_moderation. Existing
-- rows default to NOT_SCANNED (backfilled as the parent's own
-- writes — not scanned retroactively, only new writes going forward).
ALTER TABLE "Entry"
  ADD COLUMN "moderationState" "ModerationState" NOT NULL DEFAULT 'NOT_SCANNED',
  ADD COLUMN "moderationFlags" JSONB,
  ADD COLUMN "moderationRunAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Entry_moderationState_idx" ON "Entry"("moderationState");
