-- Prevent duplicate contributor invites for the same vault + email.
-- If any duplicates already exist in production, the ALTER will fail;
-- run a manual dedupe before deploying this migration in that case.

CREATE UNIQUE INDEX "Contributor_vaultId_email_key"
  ON "Contributor"("vaultId", "email");
