-- ============================================================================
-- ADD lasa_id COLUMN TO PPMP TABLE
-- ============================================================================

-- Add lasa_id column to ppmp table
ALTER TABLE procurements.ppmp
ADD COLUMN IF NOT EXISTS lasa_id BIGINT REFERENCES procurements.lasa_rows(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ppmp_lasa_id ON procurements.ppmp(lasa_id);

-- Add comment to column
COMMENT ON COLUMN procurements.ppmp.lasa_id IS 'Reference to the LASA row that this PPMP is linked to. Only LASA rows where the user is the proponent can be selected.';

