-- ============================================================================
-- ADD PROPONENT_ID COLUMN TO LASA_ROWS TABLE
-- ============================================================================
-- This migration adds a proponent_id column to lasa_rows table to track
-- the user who is the proponent of the LASA row

-- Add proponent_id column
ALTER TABLE procurements.lasa_rows
ADD COLUMN IF NOT EXISTS proponent_id BIGINT REFERENCES procurements.users(id) ON DELETE SET NULL;

-- Create index for proponent_id
CREATE INDEX IF NOT EXISTS idx_lasa_rows_proponent_id ON procurements.lasa_rows(proponent_id);

