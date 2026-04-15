-- Capsule draft-state rework:
--
-- 1. New `STAGED` value on ContributorStatus — lets the draft
--    flow store contributors that haven't had an invite email
--    sent yet. Flip to PENDING on activation.
-- 2. `clerkUserId` on CapsuleContribution — identifies the
--    organiser's own "Your contribution" entry so they can
--    edit / delete it without a token.

ALTER TYPE "ContributorStatus" ADD VALUE IF NOT EXISTS 'STAGED' BEFORE 'PENDING';

ALTER TABLE "CapsuleContribution"
  ADD COLUMN "clerkUserId" TEXT;

CREATE INDEX "CapsuleContribution_clerkUserId_idx"
  ON "CapsuleContribution"("clerkUserId");
