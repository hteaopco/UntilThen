-- Per-capsule "what they call you" override. Defaults to null so
-- existing capsules fall back to User.displayName / firstName at
-- read time without needing a backfill.
ALTER TABLE "Child"
  ADD COLUMN "parentDisplayName" TEXT;
