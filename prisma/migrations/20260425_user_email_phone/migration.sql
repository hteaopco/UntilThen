-- Add email + phone columns to User. Both nullable so the
-- migration is a no-op for existing data; backfill happens
-- opportunistically via src/lib/user-sync.ts on next sign-in
-- (looks up Clerk email and writes it to the User row when
-- email is null).
--
-- email is unique because every Clerk user has a unique
-- primary email address. Postgres allows multiple NULLs in
-- a UNIQUE column, so existing un-backfilled rows don't
-- collide with each other.
--
-- phone is plumbed for future SMS / 2FA work — no UI today.

ALTER TABLE "User"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
