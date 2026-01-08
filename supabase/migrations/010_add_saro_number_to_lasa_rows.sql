-- ============================================================================
-- ADD SARO NUMBER COLUMN TO LASA ROWS TABLE
-- ============================================================================

-- Add saro_number column to lasa_rows table
ALTER TABLE procurements.lasa_rows
ADD COLUMN IF NOT EXISTS saro_number VARCHAR(100);

-- Add index for saro_number for faster searches
CREATE INDEX IF NOT EXISTS idx_lasa_rows_saro_number ON procurements.lasa_rows(saro_number);

-- Add comment to document the field
COMMENT ON COLUMN procurements.lasa_rows.saro_number IS 'Special Allotment Release Order (SARO) number - optional reference number for budget allocation';

