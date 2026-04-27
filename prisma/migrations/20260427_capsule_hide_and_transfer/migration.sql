-- Wedding bride/groom hand-off + hide-until-reveal.
--
-- hideUntilReveal: lets the bride/groom redact every contribution
-- body on their own dashboard until revealDate. Only the count
-- shows through. Default false; flipped via
-- POST /api/capsules/[id]/hide-until-reveal.
--
-- CapsuleTransfer: pending hand-off of organiser ownership.
-- Created by POST /api/capsules/[id]/transfer, accepted by the
-- magic-link click → POST /api/capsules/transfer-accept/[token].
-- On accept we flip MemoryCapsule.organiserId in the same tx.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "hideUntilReveal" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "CapsuleTransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED');

CREATE TABLE "CapsuleTransfer" (
  "id"             TEXT NOT NULL,
  "capsuleId"      TEXT NOT NULL,
  "fromUserId"     TEXT NOT NULL,
  "toEmail"        TEXT NOT NULL,
  "toFirstName"    TEXT NOT NULL,
  "toLastName"     TEXT NOT NULL,
  "toPhone"        TEXT,
  "token"          TEXT NOT NULL,
  "status"         "CapsuleTransferStatus" NOT NULL DEFAULT 'PENDING',
  "invitedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"     TIMESTAMP(3),
  "acceptedUserId" TEXT,
  CONSTRAINT "CapsuleTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CapsuleTransfer_token_key" ON "CapsuleTransfer"("token");
CREATE INDEX "CapsuleTransfer_capsuleId_idx" ON "CapsuleTransfer"("capsuleId");
CREATE INDEX "CapsuleTransfer_toEmail_idx" ON "CapsuleTransfer"("toEmail");
CREATE INDEX "CapsuleTransfer_status_idx" ON "CapsuleTransfer"("status");

ALTER TABLE "CapsuleTransfer"
  ADD CONSTRAINT "CapsuleTransfer_capsuleId_fkey"
  FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id") ON DELETE CASCADE;
