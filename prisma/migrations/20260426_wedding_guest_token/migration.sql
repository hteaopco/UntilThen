-- Open guest-contribution token for wedding capsules. Lets the
-- couple print a single QR-code easel/table card that any guest
-- can scan and contribute to without a per-guest invite row.
-- Distinct from MemoryCapsule.accessToken (the recipient's reveal
-- magic link) so leaking one doesn't leak the other.
--
-- Nullable + UNIQUE matches Postgres semantics that allow many
-- NULLs but enforce uniqueness on populated values. Generated on
-- create when occasionType = WEDDING; remains null for every
-- other occasion.
ALTER TABLE "MemoryCapsule"
  ADD COLUMN "guestToken" TEXT;

CREATE UNIQUE INDEX "MemoryCapsule_guestToken_key"
  ON "MemoryCapsule"("guestToken");
