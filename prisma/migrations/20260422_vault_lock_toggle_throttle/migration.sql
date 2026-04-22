-- Throttle manual vault lock/unlock to once every 90 days.
-- Auto-locks from addon removal or subscription expiry don't
-- touch this column — only user-initiated toggles from the
-- capsules/billing page do, so abuse patterns (rotating a
-- single paid slot across many capsules) are capped.
ALTER TABLE "Vault"
  ADD COLUMN "lastLockToggleAt" TIMESTAMP(3);
