-- Adds the per-vault cover image URL used by the dashboard + capsule
-- landing. Stores the R2 object key; the rendering path signs a short-
-- lived GET URL so the bucket can remain private.
ALTER TABLE "Vault" ADD COLUMN "coverUrl" TEXT;
