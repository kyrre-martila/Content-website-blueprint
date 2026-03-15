-- CreateEnum
CREATE TYPE "SiteEnvironmentName" AS ENUM ('live', 'staging');

-- CreateEnum
CREATE TYPE "SiteEnvironmentState" AS ENUM ('active', 'stale', 'deleted');

-- CreateEnum
CREATE TYPE "SiteEnvironmentLockStatus" AS ENUM ('idle', 'syncing', 'pushing', 'deleting');

-- CreateTable
CREATE TABLE "SiteEnvironmentStatus" (
    "environment" "SiteEnvironmentName" NOT NULL,
    "state" "SiteEnvironmentState" NOT NULL DEFAULT 'active',
    "lastSyncedAt" TIMESTAMP(3),
    "lastPushedAt" TIMESTAMP(3),
    "lastResetAt" TIMESTAMP(3),
    "lockStatus" "SiteEnvironmentLockStatus" NOT NULL DEFAULT 'idle',
    "lastActorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteEnvironmentStatus_pkey" PRIMARY KEY ("environment")
);

-- CreateIndex
CREATE INDEX "SiteEnvironmentStatus_lastActorUserId_idx" ON "SiteEnvironmentStatus"("lastActorUserId");

-- CreateIndex
CREATE INDEX "SiteEnvironmentStatus_lockStatus_idx" ON "SiteEnvironmentStatus"("lockStatus");

-- AddForeignKey
ALTER TABLE "SiteEnvironmentStatus" ADD CONSTRAINT "SiteEnvironmentStatus_lastActorUserId_fkey" FOREIGN KEY ("lastActorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
