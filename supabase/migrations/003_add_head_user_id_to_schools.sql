-- ============================================================================
-- ADD head_user_id COLUMN TO SCHOOLS TABLE
-- ============================================================================
ALTER TABLE procurements.schools
ADD COLUMN IF NOT EXISTS head_user_id BIGINT
    REFERENCES procurements.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_schools_head_user_id ON procurements.schools(head_user_id);
