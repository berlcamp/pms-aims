-- Migration: 008_add_ppmp_app_columns.sql
-- Description: Adds PPMP and APP specific columns

-- Add PPMP-specific columns to proposal_items
ALTER TABLE assets.proposal_items
ADD COLUMN IF NOT EXISTS general_description TEXT,
ADD COLUMN IF NOT EXISTS project_objective TEXT,
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) CHECK (project_type IN ('goods', 'infrastructure', 'consulting_services')),
ADD COLUMN IF NOT EXISTS quantity_size TEXT,
ADD COLUMN IF NOT EXISTS recommended_mode_of_procurement VARCHAR(100),
ADD COLUMN IF NOT EXISTS pre_procurement_conference BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS start_of_procurement_activity DATE,
ADD COLUMN IF NOT EXISTS end_of_procurement_activity DATE,
ADD COLUMN IF NOT EXISTS expected_delivery_period TEXT,
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(15, 2);

-- Add PPMP-specific columns to procurement_proposals (for overall PPMP fields)
ALTER TABLE assets.procurement_proposals
ADD COLUMN IF NOT EXISTS source_of_funds VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS ppmp_remarks TEXT;

-- Add APP-specific columns to procurement_proposals
ALTER TABLE assets.procurement_proposals
ADD COLUMN IF NOT EXISTS pap_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS pmo_end_user VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_early_procurement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS advertisement_posting_date DATE,
ADD COLUMN IF NOT EXISTS submission_opening_date DATE,
ADD COLUMN IF NOT EXISTS notice_of_award_date DATE,
ADD COLUMN IF NOT EXISTS contract_signing_date DATE;

-- Create APP-PPMP consolidation table
CREATE TABLE IF NOT EXISTS assets.app_ppmp_consolidations (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES assets.procurement_proposals(id) ON DELETE CASCADE,
    ppmp_id BIGINT NOT NULL REFERENCES assets.procurement_proposals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, ppmp_id)
);

CREATE INDEX IF NOT EXISTS idx_app_consolidations_app_id ON assets.app_ppmp_consolidations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_consolidations_ppmp_id ON assets.app_ppmp_consolidations(ppmp_id);

-- Add trigger for updated_at on app_ppmp_consolidations
CREATE TRIGGER update_app_consolidations_updated_at
    BEFORE UPDATE ON assets.app_ppmp_consolidations
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();
