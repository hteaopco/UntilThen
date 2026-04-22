-- Lock state on Vault + addon Square sub tracking on Subscription.
--
-- Lock state: capsules beyond a user's paid slot count become
-- read-only rather than being deleted. isLocked drives the write
-- gate in entry/upload endpoints; lockedAt is just for display.
--
-- Addon tracking: each $0.99 / $6 addon is its own Square
-- Subscription resource. We push the id here on purchase so the
-- billing page can offer a per-addon Remove button without
-- needing a per-capsule linkage — capsules and slots are
-- interchangeable from the user's POV.

ALTER TABLE "Vault"
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lockedAt" TIMESTAMP(3);

ALTER TABLE "Subscription"
  ADD COLUMN "addonSquareSubIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
