-- Cron health monitoring tables.

-- CreateEnum
CREATE TYPE "CronStatus" AS ENUM ('RUNNING', 'OK', 'ERROR');

-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "cronName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "CronStatus" NOT NULL DEFAULT 'RUNNING',
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRun_cronName_startedAt_idx" ON "CronRun"("cronName", "startedAt");

-- CreateIndex
CREATE INDEX "CronRun_startedAt_idx" ON "CronRun"("startedAt");

-- CreateTable
CREATE TABLE "CronAlertState" (
    "cronName" TEXT NOT NULL,
    "lastAlertAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronAlertState_pkey" PRIMARY KEY ("cronName")
);
