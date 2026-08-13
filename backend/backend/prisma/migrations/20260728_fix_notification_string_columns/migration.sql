DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Notification'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE "Notification"
        ALTER COLUMN "type" TYPE TEXT
        USING "type"::TEXT;

        ALTER TABLE "Notification"
        ALTER COLUMN "type" SET DEFAULT 'INFO';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Notification'
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE "Notification"
        ALTER COLUMN "priority" TYPE TEXT
        USING "priority"::TEXT;

        ALTER TABLE "Notification"
        ALTER COLUMN "priority" SET DEFAULT 'NORMAL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Notification'
        AND column_name = 'audience'
    ) THEN
        ALTER TABLE "Notification"
        ALTER COLUMN "audience" TYPE TEXT
        USING "audience"::TEXT;

        ALTER TABLE "Notification"
        ALTER COLUMN "audience" SET DEFAULT 'USER';
    END IF;
END $$;