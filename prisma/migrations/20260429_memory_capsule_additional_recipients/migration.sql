-- Multi-recipient gift capsules.
--
-- Stores everyone past the primary recipient as a JSON array on
-- MemoryCapsule -- shape `[{ firstName, lastName, email }, ...]`
-- in display order. The primary recipient stays in the existing
-- recipientName + recipientEmail columns; this column is null
-- for single-recipient (or pre-multi) capsules.
--
-- Picking JSON over a join table because:
--   * recipients are write-once on creation (no per-recipient
--     mutation surface), so a relational table buys us nothing;
--   * the cron + email helpers read the whole list as one
--     payload, no joins needed;
--   * keeps the schema diff minimal -- one nullable column on
--     an existing table.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "additionalRecipients" JSONB;
