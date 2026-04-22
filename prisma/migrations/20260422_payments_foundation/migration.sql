-- Payments foundation. All three pieces needed to gate vault
-- creation and Gift Capsule activation behind Square.
--
-- This migration is additive-only: every new column defaults
-- to a safe value and the paywall toggle seeds as OFF, so the
-- product keeps working exactly as it did before after this
-- migrates. The actual gating logic stays dormant until the
-- admin flips AppConfig.paywallEnabled to true.

-- ── Enums ─────────────────────────────────────────────────
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'LOCKED');

-- ── User additions ────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "freeVaultAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "freeGiftAccess"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "squareCustomerId" TEXT;

-- ── MemoryCapsule addition ────────────────────────────────
-- paymentId + isPaid already exist on the table; paidAt is new.
ALTER TABLE "MemoryCapsule" ADD COLUMN "paidAt" TIMESTAMP(3);

-- ── Subscription ──────────────────────────────────────────
CREATE TABLE "Subscription" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "squareSubId"       TEXT NOT NULL,
  "plan"              "SubscriptionPlan"   NOT NULL,
  "status"            "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "baseCapsuleCount"  INTEGER NOT NULL DEFAULT 3,
  "addonCapsuleCount" INTEGER NOT NULL DEFAULT 0,
  "currentPeriodEnd"  TIMESTAMP(3) NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_userId_key"      ON "Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_squareSubId_key" ON "Subscription"("squareSubId");
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AppConfig ─────────────────────────────────────────────
-- Singleton row. The default on the id column locks every
-- findUnique / upsert to the same row — we never create more.
CREATE TABLE "AppConfig" (
  "id"             TEXT NOT NULL DEFAULT 'singleton',
  "paywallEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row with paywall OFF so post-migrate
-- traffic doesn't hit a payment wall mid-flight. The admin
-- flips it ON when ready.
INSERT INTO "AppConfig" ("id", "paywallEnabled", "updatedAt")
VALUES ('singleton', false, CURRENT_TIMESTAMP);
