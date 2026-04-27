-- Per-contribution edit token. Wedding guests who opt to "save
-- my email so I can edit later" receive this in the editable-
-- card email and can return via /wedding/<guestToken>?edit=<editToken>
-- to update their text and media while the capsule is still
-- ACTIVE. Stays null for non-wedding rows and for guests who
-- skipped the prompt. Indexed (and unique) so lookups by token
-- are O(1).

ALTER TABLE "CapsuleContribution"
  ADD COLUMN "editToken" TEXT;

CREATE UNIQUE INDEX "CapsuleContribution_editToken_key"
  ON "CapsuleContribution"("editToken");
