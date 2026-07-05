-- CreateTable
CREATE TABLE "public"."GatewayDevice" (
    "id" TEXT NOT NULL,
    "pairCode" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "androidVersion" TEXT,
    "manufacturer" TEXT,
    "batteryLevel" INTEGER NOT NULL DEFAULT 0,
    "signalLevel" INTEGER NOT NULL DEFAULT 0,
    "simCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "appVersion" TEXT,
    "socketId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GatewayDevice_pairCode_key" ON "public"."GatewayDevice"("pairCode");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayDevice_token_key" ON "public"."GatewayDevice"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayDevice_uniqueId_key" ON "public"."GatewayDevice"("uniqueId");
