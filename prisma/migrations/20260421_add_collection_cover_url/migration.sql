-- Adds the per-collection cover image URL. Stores the R2 object key;
-- the rendering path signs a short-lived GET URL so the bucket can
-- remain private. Mirrors the Vault.coverUrl column added earlier.
ALTER TABLE "Collection" ADD COLUMN "coverUrl" TEXT;
