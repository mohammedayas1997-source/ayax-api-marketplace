-- Convert old PostgreSQL enum columns to TEXT
-- so they match the Prisma String fields.

ALTER TABLE "Notification"
ALTER COLUMN "type" TYPE TEXT
USING "type"::TEXT;

ALTER TABLE "Notification"
ALTER COLUMN "priority" TYPE TEXT
USING "priority"::TEXT;

ALTER TABLE "Notification"
ALTER COLUMN "audience" TYPE TEXT
USING "audience"::TEXT;

-- Restore defaults expected by schema.prisma.

ALTER TABLE "Notification"
ALTER COLUMN "type" SET DEFAULT 'INFO';

ALTER TABLE "Notification"
ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

ALTER TABLE "Notification"
ALTER COLUMN "audience" SET DEFAULT 'USER';