-- Enterprise organizations — Phase 1 schema.
--
-- Three new tables (Organization, OrganizationMember,
-- OrganizationInvite) plus an organizationId column on
-- MemoryCapsule for org attribution. All capsule creation +
-- recipient-side flows are unaffected; the org link is purely
-- for usage reporting + the offboarding transfer flow.
--
-- See docs/glossary.md for the role hierarchy
-- (OWNER/ADMIN/MEMBER) and the loss-leader pricing context.

-- Roles a user can hold inside an org. Single OWNER per org
-- (billing seat); ADMIN can manage roster; MEMBER can only
-- create capsules.
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Lifecycle of a pending invite. ACCEPTED + REVOKED stay on
-- the row for audit / re-issue.
CREATE TYPE "OrganizationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "Organization" (
  "id"                  TEXT PRIMARY KEY,
  "name"                TEXT NOT NULL,
  "billingContactEmail" TEXT,
  "notes"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);

CREATE TABLE "OrganizationMember" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "role"           "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrganizationMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key"
  ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

CREATE TABLE "OrganizationInvite" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "firstName"      TEXT,
  "lastName"       TEXT,
  "phone"          TEXT,
  "role"           "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
  "inviteToken"    TEXT NOT NULL,
  "status"         "OrganizationInviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"     TIMESTAMP(3),
  "acceptedUserId" TEXT,
  CONSTRAINT "OrganizationInvite_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizationInvite_inviteToken_key"
  ON "OrganizationInvite"("inviteToken");
CREATE UNIQUE INDEX "OrganizationInvite_organizationId_email_key"
  ON "OrganizationInvite"("organizationId", "email");
CREATE INDEX "OrganizationInvite_email_idx" ON "OrganizationInvite"("email");

-- MemoryCapsule org attribution. Nullable because most capsules
-- are personal. SET NULL on delete so deleting an org doesn't
-- cascade-delete the capsules a member created (those still
-- belong to the user's personal account per spec).
ALTER TABLE "MemoryCapsule"
  ADD COLUMN "organizationId" TEXT;

ALTER TABLE "MemoryCapsule"
  ADD CONSTRAINT "MemoryCapsule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MemoryCapsule_organizationId_idx" ON "MemoryCapsule"("organizationId");
