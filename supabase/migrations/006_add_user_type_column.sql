-- ============================================================================
-- ADD TYPE COLUMN TO USERS TABLE
-- ============================================================================
-- This migration adds a 'type' column to the users table to replace the
-- roles-permissions system with a simpler user type system.

ALTER TABLE procurements.users
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'user';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_type ON procurements.users(type);

-- Update existing users to have a default type if not set
UPDATE procurements.users
SET type = 'user'
WHERE type IS NULL;

-- Add comment
COMMENT ON COLUMN procurements.users.type IS 'User type: super admin, admin, staff, or user';

