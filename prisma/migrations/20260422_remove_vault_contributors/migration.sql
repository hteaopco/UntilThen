-- Chunk 8: Remove the entire vault-contributor surface.
--
-- Vault contributors are retired in favour of the simplified
-- "owner writes → recipient opens" vault model. Gift Capsule
-- contributors are a separate concept on MemoryCapsule and are
-- untouched by this migration (CapsuleInvite / CapsuleContribution).

-- 1. Drop FK + index on Entry.contributorId, then drop the column.
ALTER TABLE "Entry" DROP CONSTRAINT IF EXISTS "Entry_contributorId_fkey";
DROP INDEX IF EXISTS "Entry_contributorId_idx";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "contributorId";

-- 2. Drop the Contributor table (CASCADE covers its indexes +
--    the FK pointing to Vault).
DROP TABLE IF EXISTS "Contributor" CASCADE;

-- 3. Drop the ContributorRole enum (only used by Contributor).
--    ContributorStatus stays — still used by CapsuleInvite.
DROP TYPE IF EXISTS "ContributorRole";

-- 4. Drop contributorActivity from NotificationPreferences.
ALTER TABLE "NotificationPreferences"
  DROP COLUMN IF EXISTS "contributorActivity";
