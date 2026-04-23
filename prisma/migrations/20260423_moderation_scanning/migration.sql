-- Add SCANNING value to the ModerationState enum. Inserted
-- between NOT_SCANNED and PASS so the enum reads in submission-
-- lifecycle order.
ALTER TYPE "ModerationState" ADD VALUE 'SCANNING' BEFORE 'PASS';
