-- Add credentials auth support (password column + verification tokens)

-- Add password column to User table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'password'
    ) THEN
        ALTER TABLE "User" ADD COLUMN password TEXT;
    END IF;
END $$;

-- Create VerificationToken table if it doesn't exist
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    identifier  TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    expires     TIMESTAMPTZ NOT NULL,
    UNIQUE(identifier, token)
);
