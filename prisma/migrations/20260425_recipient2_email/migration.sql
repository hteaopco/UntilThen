-- Second recipient email for couple gift capsules. When the
-- creation flow's "for a couple" path is used, the form collects
-- two email addresses and the reveal cron loops over
-- [recipientEmail, recipient2Email] sending to each non-null
-- entry. Single-recipient capsules leave this null.
ALTER TABLE "MemoryCapsule"
  ADD COLUMN "recipient2Email" TEXT;
