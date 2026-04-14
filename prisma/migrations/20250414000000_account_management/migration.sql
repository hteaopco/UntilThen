-- Account management: displayName + trustee fields + notifications prefs.

ALTER TABLE "User" ADD COLUMN "displayName" TEXT;

ALTER TABLE "Child" ADD COLUMN "trusteeName" TEXT;
ALTER TABLE "Child" ADD COLUMN "trusteeEmail" TEXT;

CREATE TABLE "NotificationPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "writingReminders" BOOLEAN NOT NULL DEFAULT true,
  "milestoneReminders" BOOLEAN NOT NULL DEFAULT true,
  "vaultAnniversary" BOOLEAN NOT NULL DEFAULT true,
  "contributorActivity" BOOLEAN NOT NULL DEFAULT true,
  "revealCountdown" BOOLEAN NOT NULL DEFAULT true,
  "pausedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreferences_userId_key"
  ON "NotificationPreferences"("userId");

ALTER TABLE "NotificationPreferences"
  ADD CONSTRAINT "NotificationPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
