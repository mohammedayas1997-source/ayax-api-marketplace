-- CreateTable
CREATE TABLE "public"."SimRoutingRule" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "preferredSim" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimRoutingRule_pkey" PRIMARY KEY ("id")
);
