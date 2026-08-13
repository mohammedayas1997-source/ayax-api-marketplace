-- CreateTable
CREATE TABLE "public"."NetworkProfile" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "airtimeTemplate" TEXT,
    "dataTemplate" TEXT,
    "balanceTemplate" TEXT,
    "rechargeTemplate" TEXT,
    "defaultSimSlot" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkProfile_network_key" ON "public"."NetworkProfile"("network");
