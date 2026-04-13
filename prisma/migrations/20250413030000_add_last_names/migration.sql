-- Add lastName to User (existing rows default to empty string).
ALTER TABLE "User" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

-- Split Child.name into firstName + lastName.
ALTER TABLE "Child" RENAME COLUMN "name" TO "firstName";
ALTER TABLE "Child" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
