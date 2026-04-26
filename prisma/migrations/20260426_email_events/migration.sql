-- Resend webhook events land in EmailEvent. Lets the admin
-- dashboard surface bounces / spam complaints / deliveries
-- without anyone having to log into Resend. capsuleId is set
-- when the outgoing email carried a Resend tag named
-- "capsuleId" (capsule-related templates only); invites and
-- ops emails leave it null.

CREATE TYPE "EmailEventType" AS ENUM ('DELIVERED', 'BOUNCED', 'COMPLAINED');

CREATE TABLE "EmailEvent" (
  "id"        TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "event"     "EmailEventType" NOT NULL,
  "recipient" TEXT NOT NULL,
  "capsuleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailEvent_messageId_idx" ON "EmailEvent"("messageId");
CREATE INDEX "EmailEvent_recipient_idx" ON "EmailEvent"("recipient");
CREATE INDEX "EmailEvent_capsuleId_idx" ON "EmailEvent"("capsuleId");
CREATE INDEX "EmailEvent_createdAt_idx" ON "EmailEvent"("createdAt");
