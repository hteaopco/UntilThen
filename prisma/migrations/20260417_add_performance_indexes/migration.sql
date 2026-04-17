-- Performance indexes for dashboard, cron, and admin queries

-- Entry: cron reminders query (latest entry per author)
CREATE INDEX IF NOT EXISTS "Entry_authorId_createdAt_idx" ON "Entry"("authorId", "createdAt");

-- Vault: cron countdowns query (vaults revealing soon)
CREATE INDEX IF NOT EXISTS "Vault_revealDate_idx" ON "Vault"("revealDate");

-- CapsuleContribution: pending review queue
CREATE INDEX IF NOT EXISTS "CapsuleContribution_approvalStatus_idx" ON "CapsuleContribution"("approvalStatus");
