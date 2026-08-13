-- CreateEnum
CREATE TYPE "public"."GsmDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."GsmCommandStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GsmCommandType" AS ENUM ('BUY_AIRTIME', 'BUY_DATA', 'CHECK_BALANCE', 'SEND_SMS', 'READ_SMS', 'USSD');

-- CreateTable
CREATE TABLE "public"."GsmDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "location" TEXT,
    "status" "public"."GsmDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "battery" INTEGER,
    "charging" BOOLEAN,
    "signal" INTEGER,
    "internet" BOOLEAN,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GsmDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GsmCommand" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "deviceId" TEXT,
    "type" "public"."GsmCommandType" NOT NULL,
    "payload" TEXT,
    "status" "public"."GsmCommandStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GsmCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GsmDevice_code_key" ON "public"."GsmDevice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GsmCommand_reference_key" ON "public"."GsmCommand"("reference");

-- AddForeignKey
ALTER TABLE "public"."GsmCommand" ADD CONSTRAINT "GsmCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."GsmDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
