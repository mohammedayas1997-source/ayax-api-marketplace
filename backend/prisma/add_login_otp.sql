CREATE TABLE IF NOT EXISTS "LoginOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoginOtp_pkey"
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS
"LoginOtp_userId_idx"
ON "LoginOtp"("userId");

CREATE INDEX IF NOT EXISTS
"LoginOtp_expiresAt_idx"
ON "LoginOtp"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LoginOtp_userId_fkey'
  ) THEN
    ALTER TABLE "LoginOtp"
    ADD CONSTRAINT "LoginOtp_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;