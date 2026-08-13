-- CreateTable
CREATE TABLE "public"."SmsInbox" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsInbox_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SmsInbox" ADD CONSTRAINT "SmsInbox_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."GsmDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
