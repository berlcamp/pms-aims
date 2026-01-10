-- ============================================================================
-- BUDGET ALLOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.budget_allocations (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core Identification
    division_id BIGINT NOT NULL REFERENCES procurements.divisions(id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    
    -- Allocation Details
    allocation_name VARCHAR(500) NOT NULL,
    allocation_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    fund_source VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    remarks TEXT,
    
    -- LASA Reference (optional)
    lasa_id BIGINT REFERENCES procurements.lasa_rows(id) ON DELETE SET NULL,
    
    -- Audit
    created_by BIGINT NOT NULL REFERENCES procurements.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_allocations_amount_positive CHECK (allocation_amount >= 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_budget_allocations_division_id ON procurements.budget_allocations(division_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_fiscal_year ON procurements.budget_allocations(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status ON procurements.budget_allocations(status);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_lasa_id ON procurements.budget_allocations(lasa_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_created_by ON procurements.budget_allocations(created_by);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON procurements.budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE procurements.budget_allocations ENABLE ROW LEVEL SECURITY;

-- Policy: Budget officers and super admins can do everything
CREATE POLICY budget_allocations_budget_officer_all
    ON procurements.budget_allocations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM procurements.users
            WHERE users.user_id = auth.uid()
            AND (users.type = 'budget officer' OR users.type = 'super admin')
            AND users.is_active = true
        )
    );

-- Policy: Other users can only read
CREATE POLICY budget_allocations_read_only
    ON procurements.budget_allocations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM procurements.users
            WHERE users.user_id = auth.uid()
            AND users.is_active = true
        )
    );
