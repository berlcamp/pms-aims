-- Migration: 007_create_indexes_rls.sql
-- Description: Creates additional indexes, Row Level Security policies, and helper functions
-- Schema: assets

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_proposals_division_status ON assets.procurement_proposals(division_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_fiscal_year_type ON assets.procurement_proposals(fiscal_year, type);
CREATE INDEX IF NOT EXISTS idx_pr_division_status ON assets.purchase_requests(division_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by_status ON assets.purchase_requests(requested_by, status);
CREATE INDEX IF NOT EXISTS idx_po_division_status ON assets.purchase_orders(division_id, status);
CREATE INDEX IF NOT EXISTS idx_po_supplier_status ON assets.purchase_orders(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_dr_po_status ON assets.delivery_receipts(po_id, status);
CREATE INDEX IF NOT EXISTS idx_iar_po_status ON assets.inspection_acceptance_reports(po_id, status);

-- Full-text search indexes (if needed)
-- CREATE INDEX IF NOT EXISTS idx_proposals_title_fts ON assets.procurement_proposals USING gin(to_tsvector('english', title));
-- CREATE INDEX IF NOT EXISTS idx_suppliers_name_fts ON assets.suppliers USING gin(to_tsvector('english', name));

-- ============================================================================
-- DOCUMENT MANAGEMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'ppmp', 'app', 'pr', 'po', 'quotation', 'canvass', 
        'delivery_receipt', 'iar', 'obr', 'dv', 'other'
    )),
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    version INTEGER DEFAULT 1,
    uploaded_by UUID NOT NULL REFERENCES assets.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON assets.procurement_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON assets.procurement_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON assets.procurement_documents(uploaded_by);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'approval_request', 'approval_approved', 'approval_rejected', 'approval_returned',
        'delivery_received', 'inspection_completed', 'payment_forwarded', 'system_alert'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON assets.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON assets.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON assets.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON assets.notifications(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE assets.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.procurement_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.pre_procurement_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.pr_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.supplier_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.canvasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.inspection_acceptance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.procurement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.procurement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's division/school IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.get_user_tenant_ids(p_user_id UUID)
RETURNS TABLE (
    division_id UUID,
    school_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.division_id,
        u.school_id
    FROM assets.users u
    WHERE u.id = p_user_id
    AND u.is_active = true
    AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user can access division/school
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.can_user_access_tenant(
    p_user_id UUID,
    p_division_id UUID,
    p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_division_id UUID;
    v_user_school_id UUID;
    v_is_sds BOOLEAN;
BEGIN
    -- Get user's tenant IDs
    SELECT division_id, school_id INTO v_user_division_id, v_user_school_id
    FROM assets.get_user_tenant_ids(p_user_id);
    
    -- Check if user is SDS (can access all divisions)
    SELECT EXISTS (
        SELECT 1
        FROM assets.user_roles ur
        JOIN assets.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND ur.is_active = true
        AND r.code = 'SDS'
    ) INTO v_is_sds;
    
    IF v_is_sds THEN
        RETURN true;
    END IF;
    
    -- Check division access
    IF p_division_id IS NOT NULL THEN
        IF v_user_division_id = p_division_id THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check school access
    IF p_school_id IS NOT NULL THEN
        IF v_user_school_id = p_school_id THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: DIVISIONS
-- ============================================================================
CREATE POLICY "Users can view divisions"
    ON assets.divisions FOR SELECT
    USING (true); -- All authenticated users can view divisions

CREATE POLICY "SDS can manage divisions"
    ON assets.divisions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM assets.user_roles ur
            JOIN assets.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
            AND r.code = 'SDS'
            AND ur.is_active = true
        )
    );

-- ============================================================================
-- RLS POLICIES: SCHOOLS
-- ============================================================================
CREATE POLICY "Users can view schools in their division"
    ON assets.schools FOR SELECT
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        EXISTS (
            SELECT 1 FROM assets.user_roles ur
            JOIN assets.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
            AND r.code = 'SDS'
        )
    );

CREATE POLICY "Users can manage schools in their division"
    ON assets.schools FOR ALL
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        EXISTS (
            SELECT 1 FROM assets.user_roles ur
            JOIN assets.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
            AND r.code IN ('SDS', 'SUPPLY_OFFICER_DIV')
        )
    );

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================
CREATE POLICY "Users can view users in their tenant"
    ON assets.users FOR SELECT
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
        OR
        EXISTS (
            SELECT 1 FROM assets.user_roles ur
            JOIN assets.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
            AND r.code = 'SDS'
        )
    );

-- ============================================================================
-- RLS POLICIES: PROCUREMENT PROPOSALS
-- ============================================================================
CREATE POLICY "Users can view proposals in their tenant"
    ON assets.procurement_proposals FOR SELECT
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Users can manage proposals in their tenant"
    ON assets.procurement_proposals FOR ALL
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE REQUESTS
-- ============================================================================
CREATE POLICY "Users can view PRs in their tenant"
    ON assets.purchase_requests FOR SELECT
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Users can manage PRs in their tenant"
    ON assets.purchase_requests FOR ALL
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

-- ============================================================================
-- RLS POLICIES: PURCHASE ORDERS
-- ============================================================================
CREATE POLICY "Users can view POs in their tenant"
    ON assets.purchase_orders FOR SELECT
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

CREATE POLICY "Users can manage POs in their tenant"
    ON assets.purchase_orders FOR ALL
    USING (
        division_id IN (
            SELECT division_id FROM assets.users 
            WHERE user_id = auth.uid() AND division_id IS NOT NULL
        )
        OR
        school_id IN (
            SELECT school_id FROM assets.users 
            WHERE user_id = auth.uid() AND school_id IS NOT NULL
        )
    );

-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================
CREATE POLICY "Users can view their own notifications"
    ON assets.notifications FOR SELECT
    USING (
        user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own notifications"
    ON assets.notifications FOR UPDATE
    USING (
        user_id IN (SELECT id FROM assets.users WHERE user_id = auth.uid())
    );

-- ============================================================================
-- NUMBERING SEQUENCE FUNCTIONS
-- ============================================================================

-- Function to generate PR number
CREATE OR REPLACE FUNCTION assets.generate_pr_number(p_fiscal_year INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_seq INTEGER;
    v_number VARCHAR;
BEGIN
    -- Get next sequence for this fiscal year
    SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM assets.purchase_requests
    WHERE pr_number LIKE 'PR-' || p_fiscal_year || '-%';
    
    v_number := 'PR-' || p_fiscal_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION assets.generate_po_number(p_fiscal_year INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_seq INTEGER;
    v_number VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM assets.purchase_orders
    WHERE po_number LIKE 'PO-' || p_fiscal_year || '-%';
    
    v_number := 'PO-' || p_fiscal_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION assets.generate_proposal_number(
    p_type VARCHAR,
    p_fiscal_year INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
    v_seq INTEGER;
    v_number VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(proposal_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM assets.procurement_proposals
    WHERE proposal_number LIKE p_type || '-' || p_fiscal_year || '-%';
    
    v_number := p_type || '-' || p_fiscal_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;
