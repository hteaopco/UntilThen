-- Manual-seal flag for gift capsules. When true, the capsule
-- still has its ACTIVE status (so the reveal cron picks it up
-- on revealDate as normal), but all contribution-mutating
-- routes (/invites, /contribute submit, organiser self-
-- contribution) reject with 410. Reversible — organisers can
-- toggle it back to false from the capsule dashboard.
-- effectiveStatus() in lib/capsules.ts maps an ACTIVE +
-- contributionsClosed capsule to a derived SEALED so existing
-- gating logic doesn't need to learn about the new column.
ALTER TABLE "MemoryCapsule"
  ADD COLUMN "contributionsClosed" BOOLEAN NOT NULL DEFAULT false;
