-- Onboarding split: record which product a user came through so
-- the dashboard empty states and analytics can segment cleanly.
-- PARENT is the default to preserve the historical path for
-- existing users.

CREATE TYPE "UserType" AS ENUM (
  'PARENT',
  'ORGANISER',
  'BOTH'
);

ALTER TABLE "User"
  ADD COLUMN "userType" "UserType" NOT NULL DEFAULT 'PARENT';

-- Backfill: every existing user came through the child-vault
-- path, so PARENT is already correct. If they've also created a
-- Memory Capsule, flip to BOTH so the segment stays honest.
UPDATE "User"
  SET "userType" = 'BOTH'
  WHERE "id" IN (SELECT DISTINCT "organiserId" FROM "MemoryCapsule");
