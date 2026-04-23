-- Support for email-based PIN reset. Token is hashed before
-- storage; the raw token goes in the reset-link email only.
ALTER TABLE "User"
  ADD COLUMN "pinResetTokenHash" TEXT,
  ADD COLUMN "pinResetExpires"   TIMESTAMP(3);
