-- Extend Role enum with CONTRIBUTOR
ALTER TYPE "Role" ADD VALUE 'CONTRIBUTOR';

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_REVIEW', 'AUTO_APPROVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContributorRole" AS ENUM ('FAMILY', 'FRIEND', 'TEACHER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContributorStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "ContributorRole" NOT NULL DEFAULT 'FAMILY',
    "status" "ContributorStatus" NOT NULL DEFAULT 'PENDING',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "inviteToken" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contributor_inviteToken_key" ON "Contributor"("inviteToken");
CREATE INDEX "Contributor_vaultId_idx" ON "Contributor"("vaultId");
CREATE INDEX "Contributor_inviteToken_idx" ON "Contributor"("inviteToken");
CREATE INDEX "Contributor_clerkUserId_idx" ON "Contributor"("clerkUserId");

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Entry
ALTER TABLE "Entry" ADD COLUMN "contributorId" TEXT;
ALTER TABLE "Entry" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'AUTO_APPROVED';

-- CreateIndex for Entry.contributorId and Entry.approvalStatus
CREATE INDEX "Entry_contributorId_idx" ON "Entry"("contributorId");
CREATE INDEX "Entry_approvalStatus_idx" ON "Entry"("approvalStatus");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Contributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
