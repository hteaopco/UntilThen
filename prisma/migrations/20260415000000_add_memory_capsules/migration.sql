-- Memory Capsules: one-time occasion-based capsules (birthday,
-- anniversary, retirement, etc.) alongside the long-form child
-- Vault product. Includes public-facing contributions and a
-- magic-link recipient flow.

-- Enums
CREATE TYPE "OccasionType" AS ENUM (
  'BIRTHDAY',
  'ANNIVERSARY',
  'RETIREMENT',
  'GRADUATION',
  'WEDDING',
  'OTHER'
);

CREATE TYPE "CapsuleStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SEALED',
  'REVEALED'
);

-- Capsule
CREATE TABLE "MemoryCapsule" (
  "id"                  TEXT            NOT NULL,
  "organiserId"         TEXT            NOT NULL,
  "title"               TEXT            NOT NULL,
  "recipientName"       TEXT            NOT NULL,
  "recipientEmail"      TEXT            NOT NULL,
  "occasionType"        "OccasionType"  NOT NULL DEFAULT 'OTHER',
  "revealDate"          TIMESTAMP(3)    NOT NULL,
  "contributorDeadline" TIMESTAMP(3),
  "status"              "CapsuleStatus" NOT NULL DEFAULT 'DRAFT',
  "requiresApproval"    BOOLEAN         NOT NULL DEFAULT false,
  "paymentId"           TEXT,
  "isPaid"              BOOLEAN         NOT NULL DEFAULT false,
  "accessToken"         TEXT            NOT NULL,
  "tokenExpiresAt"      TIMESTAMP(3),
  "recipientClerkId"    TEXT,
  "firstOpenedAt"       TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "MemoryCapsule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemoryCapsule_accessToken_key" ON "MemoryCapsule"("accessToken");
CREATE INDEX "MemoryCapsule_organiserId_idx" ON "MemoryCapsule"("organiserId");
CREATE INDEX "MemoryCapsule_accessToken_idx" ON "MemoryCapsule"("accessToken");
CREATE INDEX "MemoryCapsule_status_idx" ON "MemoryCapsule"("status");
ALTER TABLE "MemoryCapsule"
  ADD CONSTRAINT "MemoryCapsule_organiserId_fkey"
  FOREIGN KEY ("organiserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contribution (public-facing; no Clerk account required)
CREATE TABLE "CapsuleContribution" (
  "id"             TEXT             NOT NULL,
  "capsuleId"      TEXT             NOT NULL,
  "authorName"     TEXT             NOT NULL,
  "authorEmail"    TEXT,
  "type"           "EntryType"      NOT NULL DEFAULT 'TEXT',
  "body"           TEXT,
  "mediaUrls"      TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mediaTypes"     TEXT[]           NOT NULL DEFAULT ARRAY[]::TEXT[],
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'AUTO_APPROVED',
  "orderIndex"     INTEGER,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapsuleContribution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CapsuleContribution_capsuleId_idx" ON "CapsuleContribution"("capsuleId");
ALTER TABLE "CapsuleContribution"
  ADD CONSTRAINT "CapsuleContribution_capsuleId_fkey"
  FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Invite
CREATE TABLE "CapsuleInvite" (
  "id"          TEXT                NOT NULL,
  "capsuleId"   TEXT                NOT NULL,
  "email"       TEXT                NOT NULL,
  "name"        TEXT,
  "inviteToken" TEXT                NOT NULL,
  "status"      "ContributorStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"  TIMESTAMP(3),
  CONSTRAINT "CapsuleInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CapsuleInvite_inviteToken_key" ON "CapsuleInvite"("inviteToken");
CREATE INDEX "CapsuleInvite_capsuleId_idx" ON "CapsuleInvite"("capsuleId");
CREATE INDEX "CapsuleInvite_inviteToken_idx" ON "CapsuleInvite"("inviteToken");
ALTER TABLE "CapsuleInvite"
  ADD CONSTRAINT "CapsuleInvite_capsuleId_fkey"
  FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
