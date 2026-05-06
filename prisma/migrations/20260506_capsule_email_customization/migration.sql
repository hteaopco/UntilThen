-- Organiser-customisable email fields on MemoryCapsule.
-- All four columns are nullable — null = use the default template.
ALTER TABLE "MemoryCapsule" ADD COLUMN "contributorEmailSubject" TEXT;
ALTER TABLE "MemoryCapsule" ADD COLUMN "contributorEmailBody"    TEXT;
ALTER TABLE "MemoryCapsule" ADD COLUMN "revealEmailSubject"      TEXT;
ALTER TABLE "MemoryCapsule" ADD COLUMN "revealEmailBody"         TEXT;
