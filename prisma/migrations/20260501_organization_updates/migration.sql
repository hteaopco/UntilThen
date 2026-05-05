-- Free-text announcements an org OWNER/ADMIN posts to every
-- member of the organization. Surfaces on each member's
-- /dashboard/updates page alongside their pending-contribution
-- inbox. authorUserId is nullable so a posting admin who
-- later leaves the org doesn't take the post with them; the
-- denormalised authorName is what we render.

CREATE TABLE "OrganizationUpdate" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "authorUserId"   TEXT,
  "authorName"     TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationUpdate_organizationId_createdAt_idx"
  ON "OrganizationUpdate" ("organizationId", "createdAt");

ALTER TABLE "OrganizationUpdate"
  ADD CONSTRAINT "OrganizationUpdate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationUpdate"
  ADD CONSTRAINT "OrganizationUpdate_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
