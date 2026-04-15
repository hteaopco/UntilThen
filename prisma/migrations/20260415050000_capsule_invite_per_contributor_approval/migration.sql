-- Per-contributor approval.
--
-- Approval moves from a capsule-wide flag to a per-invite flag
-- so the organiser can decide review-before-reveal individually
-- for each contributor at invite time. Backfill from the
-- capsule's existing `requiresApproval` so nothing changes for
-- already-invited contributors on existing capsules.

ALTER TABLE "CapsuleInvite"
  ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CapsuleInvite" AS i
  SET "requiresApproval" = c."requiresApproval"
  FROM "MemoryCapsule" AS c
  WHERE i."capsuleId" = c."id";
