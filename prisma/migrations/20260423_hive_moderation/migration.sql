-- CreateEnum
CREATE TYPE "ModerationState" AS ENUM ('NOT_SCANNED', 'PASS', 'FLAGGED', 'FAILED_OPEN');

-- AlterTable
ALTER TABLE "CapsuleContribution"
  ADD COLUMN "moderationState" "ModerationState" NOT NULL DEFAULT 'NOT_SCANNED',
  ADD COLUMN "moderationFlags" JSONB,
  ADD COLUMN "moderationRunAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CapsuleContribution_moderationState_idx" ON "CapsuleContribution"("moderationState");
