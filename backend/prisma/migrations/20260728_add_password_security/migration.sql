CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey"
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"PasswordResetToken_tokenHash_key"
ON "PasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS
"PasswordResetToken_userId_idx"
ON "PasswordResetToken"("userId");

CREATE INDEX IF NOT EXISTS
"PasswordResetToken_expiresAt_idx"
ON "PasswordResetToken"("expiresAt");

CREATE INDEX IF NOT EXISTS
"PasswordResetToken_usedAt_idx"
ON "PasswordResetToken"("usedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT
    "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS "RevokedToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RevokedToken_pkey"
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"RevokedToken_tokenId_key"
ON "RevokedToken"("tokenId");

CREATE INDEX IF NOT EXISTS
"RevokedToken_userId_idx"
ON "RevokedToken"("userId");

CREATE INDEX IF NOT EXISTS
"RevokedToken_expiresAt_idx"
ON "RevokedToken"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'RevokedToken_userId_fkey'
  ) THEN
    ALTER TABLE "RevokedToken"
    ADD CONSTRAINT
    "RevokedToken_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;