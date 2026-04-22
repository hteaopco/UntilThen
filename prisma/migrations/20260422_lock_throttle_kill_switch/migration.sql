-- Admin-controlled kill switch for the 90-day lock/unlock
-- cooldown. When true, the lock/unlock endpoint skips the
-- lastLockToggleAt check so we can rotate capsules during
-- pre-launch testing without burning the cooldown.
ALTER TABLE "AppConfig"
  ADD COLUMN "lockThrottleDisabled" BOOLEAN NOT NULL DEFAULT false;
