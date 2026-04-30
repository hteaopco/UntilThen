-- Memory capsule cover image.
--
-- Optional R2 object key for a per-capsule cover photo, mirroring
-- Vault.coverUrl and Collection.coverUrl. Set via the new
-- /api/capsules/[id]/cover PATCH (and cleared by DELETE) on the
-- same signed-PUT pattern the vault and collection covers already
-- use. Null = render the gradient + initials placeholder; the UI
-- avatar bubble next to the capsule title pulls the signed GET URL
-- when this column has a value.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "coverUrl" TEXT;
