-- Object-form pronoun per capsule so emotional copy can say
-- "Send this to everyone who loves her" for a specific
-- recipient instead of using the recipient name verbatim.
-- Nullable on purpose — rows without a preference fall back to
-- "them" in display.
ALTER TABLE "MemoryCapsule"
  ADD COLUMN "recipientPronoun" TEXT;
