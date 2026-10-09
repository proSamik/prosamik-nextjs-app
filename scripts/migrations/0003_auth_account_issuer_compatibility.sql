-- Better Auth no longer writes the legacy issuer column. Keep its existing
-- values while allowing new account inserts to omit it. Fresh databases may
-- not have this column at all.
DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'account' AND column_name = 'issuer'
    ) THEN
        ALTER TABLE account ALTER COLUMN issuer DROP NOT NULL;
    END IF;
END
$migration$;
