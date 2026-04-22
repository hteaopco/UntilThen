-- Adds the per-user avatar R2 object key. Stores the key only;
-- the rendering path signs a short-lived GET URL so the bucket
-- stays private. Mirrors Vault.coverUrl / Collection.coverUrl.
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
