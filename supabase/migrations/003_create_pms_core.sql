-- Migration: 003_create_pms_core.sql
-- Description: Creates core Procurement Management System tables
-- Schema: assets

-- ============================================================================
-- PROCUREMENT PROPOSALS (PPMP/APP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_proposals (
    id BIGSERIAL PRIMARY KEY,
    proposal_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('PPMP', 'APP')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('goods', 'services', 'infrastructure')),
    level VARCHAR(20) NOT NULL CHECK (level IN ('school', 'division')),
    division_id BIGINT NOT NULL REFERENCES assets.divisions(id) ON DELETE RESTRICT,
    school_id BIGINT REFERENCES assets.schools(id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    budget_source VARCHAR(100) NOT NULL,
    fund_code VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'under_evaluation', 'approved', 'rejected', 'returned', 'cancelled'
    )),
    version INTEGER NOT NULL DEFAULT 1,
    parent_proposal_id BIGINT REFERENCES assets.procurement_proposals(id) ON DELETE SET NULL,
    change_reason TEXT,
    submitted_by BIGINT REFERENCES assets.users(id),
    submitted_at TIMESTAMPTZ,
    approved_by BIGINT REFERENCES assets.users(id),
    approved_at TIMESTAMPTZ,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PROPOSAL ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.proposal_items (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT NOT NULL REFERENCES assets.procurement_proposals(id) ON DELETE CASCADE,
    item_code VARCHAR(50),
    item_name VARCHAR(500) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    quarter_1 NUMERIC(10, 2),
    quarter_2 NUMERIC(10, 2),
    quarter_3 NUMERIC(10, 2),
    quarter_4 NUMERIC(10, 2),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRE-PROCUREMENT EVALUATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.pre_procurement_evaluations (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT NOT NULL REFERENCES assets.procurement_proposals(id) ON DELETE CASCADE,
    evaluation_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'approved', 'rejected', 'returned', 'cancelled'
    )),
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 4),
    -- Stage 1: Supply Officer
    supply_officer_reviewed BOOLEAN DEFAULT false,
    supply_officer_remarks TEXT,
    supply_officer_reviewed_by BIGINT REFERENCES assets.users(id),
    supply_officer_reviewed_at TIMESTAMPTZ,
    -- Stage 2: Budget Officer
    budget_officer_reviewed BOOLEAN DEFAULT false,
    budget_officer_remarks TEXT,
    budget_officer_reviewed_by BIGINT REFERENCES assets.users(id),
    budget_officer_reviewed_at TIMESTAMPTZ,
    -- Stage 3: Technical Evaluator
    technical_evaluator_reviewed BOOLEAN DEFAULT false,
    technical_evaluator_remarks TEXT,
    technical_evaluator_reviewed_by BIGINT REFERENCES assets.users(id),
    technical_evaluator_reviewed_at TIMESTAMPTZ,
    -- Stage 4: BAC
    bac_reviewed BOOLEAN DEFAULT false,
    bac_remarks TEXT,
    bac_reviewed_by BIGINT REFERENCES assets.users(id),
    bac_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCUREMENT METHOD CONFIGURATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_method_configs (
    id BIGSERIAL PRIMARY KEY,
    method VARCHAR(50) UNIQUE NOT NULL CHECK (method IN (
        'small_value_procurement', 'shopping', 'agency_to_agency', 'public_bidding', 'repeat_order'
    )),
    name VARCHAR(255) NOT NULL,
    threshold_min NUMERIC(15, 2),
    threshold_max NUMERIC(15, 2),
    description TEXT,
    required_documents JSONB DEFAULT '[]'::JSONB,
    approval_chain JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PURCHASE REQUESTS (PR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.purchase_requests (
    id BIGSERIAL PRIMARY KEY,
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    proposal_id BIGINT REFERENCES assets.procurement_proposals(id) ON DELETE SET NULL,
    evaluation_id BIGINT REFERENCES assets.pre_procurement_evaluations(id) ON DELETE SET NULL,
    procurement_method VARCHAR(50) REFERENCES assets.procurement_method_configs(method),
    division_id BIGINT NOT NULL REFERENCES assets.divisions(id) ON DELETE RESTRICT,
    school_id BIGINT REFERENCES assets.schools(id) ON DELETE RESTRICT,
    requested_by BIGINT NOT NULL REFERENCES assets.users(id),
    department VARCHAR(255),
    purpose TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    fund_source VARCHAR(100) NOT NULL,
    fund_code VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_requester', 'pending_dept_head', 'pending_supply_officer',
        'pending_bac', 'pending_budget_officer', 'pending_accounting_officer',
        'pending_sds', 'approved', 'rejected', 'returned', 'cancelled'
    )),
    current_approval_stage INTEGER NOT NULL DEFAULT 0,
    approved_by BIGINT REFERENCES assets.users(id),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PR ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.pr_items (
    id BIGSERIAL PRIMARY KEY,
    pr_id BIGINT NOT NULL REFERENCES assets.purchase_requests(id) ON DELETE CASCADE,
    item_code VARCHAR(50),
    item_name VARCHAR(500) NOT NULL,
    description TEXT,
    specification TEXT,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_proposals_division_id ON assets.procurement_proposals(division_id);
CREATE INDEX IF NOT EXISTS idx_proposals_school_id ON assets.procurement_proposals(school_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON assets.procurement_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_fiscal_year ON assets.procurement_proposals(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON assets.procurement_proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON assets.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_proposal_id ON assets.pre_procurement_evaluations(proposal_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON assets.pre_procurement_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_pr_division_id ON assets.purchase_requests(division_id);
CREATE INDEX IF NOT EXISTS idx_pr_school_id ON assets.purchase_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON assets.purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_number ON assets.purchase_requests(pr_number);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by ON assets.purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr_id ON assets.pr_items(pr_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON assets.procurement_proposals
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_proposal_items_updated_at
    BEFORE UPDATE ON assets.proposal_items
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON assets.pre_procurement_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_method_configs_updated_at
    BEFORE UPDATE ON assets.procurement_method_configs
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_pr_updated_at
    BEFORE UPDATE ON assets.purchase_requests
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_pr_items_updated_at
    BEFORE UPDATE ON assets.pr_items
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

-- ============================================================================
-- INSERT DEFAULT PROCUREMENT METHODS
-- ============================================================================
INSERT INTO assets.procurement_method_configs (method, name, threshold_min, threshold_max, description, required_documents, approval_chain) VALUES
    ('small_value_procurement', 'Small Value Procurement', 0, 50000, 'For procurement below PHP 50,000', '[]'::JSONB, '["SUPPLY_OFFICER_DIV", "BUDGET_OFFICER"]'::JSONB),
    ('shopping', 'Shopping', 50000, 500000, 'For procurement between PHP 50,000 and PHP 500,000', '[]'::JSONB, '["SUPPLY_OFFICER_DIV", "BAC_CHAIR", "BUDGET_OFFICER"]'::JSONB),
    ('agency_to_agency', 'Agency-to-Agency', NULL, NULL, 'Procurement from another government agency', '[]'::JSONB, '["SUPPLY_OFFICER_DIV", "BAC_CHAIR", "SDS"]'::JSONB),
    ('public_bidding', 'Public Bidding', 500000, NULL, 'For procurement above PHP 500,000', '[]'::JSONB, '["SUPPLY_OFFICER_DIV", "BAC_CHAIR", "SDS"]'::JSONB),
    ('repeat_order', 'Repeat Order', NULL, NULL, 'Repeat order from previous supplier', '[]'::JSONB, '["SUPPLY_OFFICER_DIV", "BUDGET_OFFICER"]'::JSONB)
ON CONFLICT (method) DO NOTHING;
