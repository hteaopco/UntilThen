-- Wedding "Save For Later" leads. Captured from the guest
-- contributor flow when a guest taps "Save For Later" on the
-- invitation card. We store first/last/phone with the
-- originating guestToken so a future SMS reminder can fire a
-- one-tap link back to /wedding/[token]. reminderSent stays
-- false until that dispatch lands.

CREATE TABLE "WeddingSaveForLater" (
  "id"             TEXT NOT NULL,
  "capsuleId"      TEXT NOT NULL,
  "guestToken"     TEXT NOT NULL,
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "phone"          TEXT NOT NULL,
  "reminderSent"   BOOLEAN NOT NULL DEFAULT false,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeddingSaveForLater_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeddingSaveForLater_capsuleId_idx"    ON "WeddingSaveForLater"("capsuleId");
CREATE INDEX "WeddingSaveForLater_guestToken_idx"   ON "WeddingSaveForLater"("guestToken");
CREATE INDEX "WeddingSaveForLater_reminderSent_idx" ON "WeddingSaveForLater"("reminderSent");
CREATE INDEX "WeddingSaveForLater_createdAt_idx"    ON "WeddingSaveForLater"("createdAt");

ALTER TABLE "WeddingSaveForLater"
  ADD CONSTRAINT "WeddingSaveForLater_capsuleId_fkey"
  FOREIGN KEY ("capsuleId") REFERENCES "MemoryCapsule"("id") ON DELETE CASCADE;
