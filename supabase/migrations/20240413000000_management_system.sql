-- Phase 1: Database Schema Updates

-- 1. Ensure menu table has is_sold_out (though it was already in setup_db.sql, we make sure for existing DBs)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu' AND column_name='is_sold_out') THEN
        ALTER TABLE menu ADD COLUMN is_sold_out BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_open BOOLEAN DEFAULT TRUE,
    closed_message TEXT DEFAULT 'Uzr, bugun dam olish kunimiz.',
    CONSTRAINT one_row CHECK (id = 1) -- Ensure only one settings row exists
);

-- 3. Initial settings row if not exists
INSERT INTO settings (id, is_open, closed_message)
VALUES (1, TRUE, 'Uzr, bugun dam olish kunimiz.')
ON CONFLICT (id) DO NOTHING;
