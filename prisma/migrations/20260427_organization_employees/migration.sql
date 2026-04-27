-- Organization Employee Roster — lightweight per-org people
-- database. Distinct from OrganizationMember (auth identities);
-- these are records of people the org may want to gift to /
-- collect contributions from. Surfaced as a tab on
-- /enterprise/roster and as a picker modal on the contributor +
-- recipient flows.

CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

CREATE TABLE "OrganizationEmployee" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "phone"          TEXT,
  "department"     TEXT,
  "subTeam"        TEXT,
  "status"         "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "inactivatedAt"  TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationEmployee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationEmployee_organizationId_email_key"
  ON "OrganizationEmployee"("organizationId", "email");

CREATE INDEX "OrganizationEmployee_organizationId_status_idx"
  ON "OrganizationEmployee"("organizationId", "status");

CREATE INDEX "OrganizationEmployee_organizationId_department_idx"
  ON "OrganizationEmployee"("organizationId", "department");

CREATE INDEX "OrganizationEmployee_organizationId_subTeam_idx"
  ON "OrganizationEmployee"("organizationId", "subTeam");

CREATE INDEX "OrganizationEmployee_organizationId_lastName_idx"
  ON "OrganizationEmployee"("organizationId", "lastName");

ALTER TABLE "OrganizationEmployee"
  ADD CONSTRAINT "OrganizationEmployee_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
