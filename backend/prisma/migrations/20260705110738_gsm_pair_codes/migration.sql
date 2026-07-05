/*
  Warnings:

  - The `status` column on the `GsmPairCode` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."PairStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."GsmPairCode" DROP COLUMN "status",
ADD COLUMN     "status" "public"."PairStatus" NOT NULL DEFAULT 'PENDING';
