-- Capsule archive + nullable organiser.
--
-- archivedAt: soft-hide flag for the organiser's dashboard. Once
-- a capsule has been SENT or REVEALED we block hard delete (the
-- recipient must never lose access), so the only way the
-- organiser removes it from their main view is by setting this
-- timestamp. Null = visible; non-null = archived (still
-- accessible under an Archived view).
--
-- organiserId nullable: when the organiser deletes their Clerk
-- account, capsules that are SENT/REVEALED or already saved by
-- the recipient (recipientClerkId set) are preserved so the
-- recipient keeps access; their organiserId is detached to NULL
-- via the new ON DELETE SET NULL FK rule. Pure DRAFT/ACTIVE
-- capsules with no recipient save are still hard-deleted by the
-- account-delete cascade.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "MemoryCapsule"
  ALTER COLUMN "organiserId" DROP NOT NULL;

ALTER TABLE "MemoryCapsule"
  DROP CONSTRAINT "MemoryCapsule_organiserId_fkey";

ALTER TABLE "MemoryCapsule"
  ADD CONSTRAINT "MemoryCapsule_organiserId_fkey"
  FOREIGN KEY ("organiserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
