DO $$
DECLARE
    status_type TEXT;
BEGIN
    SELECT udt_name
    INTO status_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'rooms'
      AND column_name = 'status';

    IF status_type IS NOT NULL AND status_type NOT IN ('varchar', 'text', 'bpchar') THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''RESERVED''', status_type);
    END IF;
END $$
@@