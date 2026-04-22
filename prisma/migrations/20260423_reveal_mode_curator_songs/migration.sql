-- Reveal-reel curation: per-vault Random vs Build mode + saved
-- curatedSlides + selected background song. Plus a RevealSong
-- catalog of admin-uploaded MP3s that capsule owners pick from.

CREATE TYPE "RevealMode" AS ENUM ('RANDOM', 'BUILD');

CREATE TABLE "RevealSong" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "r2Key"       TEXT NOT NULL,
  "durationSec" INTEGER,
  "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevealSong_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RevealSong_r2Key_key" ON "RevealSong"("r2Key");

ALTER TABLE "Vault"
  ADD COLUMN "revealMode"    "RevealMode" NOT NULL DEFAULT 'RANDOM',
  ADD COLUMN "curatedSlides" JSONB,
  ADD COLUMN "revealSongId"  TEXT,
  ADD CONSTRAINT "Vault_revealSongId_fkey"
    FOREIGN KEY ("revealSongId")
    REFERENCES "RevealSong"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Vault_revealSongId_idx" ON "Vault"("revealSongId");
