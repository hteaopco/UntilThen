-- CapsuleContribution gets a title column so the organiser's
-- "Your contribution" editor can carry the same Title + body +
-- media triple as the child-vault Entry editor.
ALTER TABLE "CapsuleContribution"
  ADD COLUMN "title" TEXT;
