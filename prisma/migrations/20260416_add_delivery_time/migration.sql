-- AlterTable: add delivery time + timezone to Vault (Time Capsules)
ALTER TABLE "Vault" ADD COLUMN "deliveryTime" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "Vault" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

-- AlterTable: add delivery time + timezone to MemoryCapsule (Gift Capsules)
ALTER TABLE "MemoryCapsule" ADD COLUMN "deliveryTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "MemoryCapsule" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';
