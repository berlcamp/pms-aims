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
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'ppmp', 'app', 'pr', 'po', 'quotation', 'canvass', 
        'delivery_receipt', 'iar', 'obr', 'dv', 'other'
    )),
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    version INTEGER DEFAULT 1,
    uploaded_by BIGINT NOT NULL REFERENCES assets.users(id),
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'approval_request', 'approval_approved', 'approval_rejected', 'approval_returned',
        'delivery_received', 'inspection_completed', 'payment_forwarded', 'system_alert'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
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
CREATE OR REPLACE FUNCTION assets.get_user_tenant_ids(p_user_id BIGINT)
RETURNS TABLE (
    division_id BIGINT,
    school_id BIGINT
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
    p_user_id BIGINT,
    p_division_id BIGINT,
    p_school_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_division_id BIGINT;
    v_user_school_id BIGINT;
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
-- RLS POLICIES: Simple policies for authenticated users
-- ============================================================================

-- Drop all existing policies (if any)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'assets') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create one policy per table allowing ALL operations for authenticated users
CREATE POLICY "Authenticated users can access divisions"
    ON assets.divisions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access schools"
    ON assets.schools FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access roles"
    ON assets.roles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access permissions"
    ON assets.permissions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access users"
    ON assets.users FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access user_roles"
    ON assets.user_roles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access role_permissions"
    ON assets.role_permissions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access procurement_proposals"
    ON assets.procurement_proposals FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access proposal_items"
    ON assets.proposal_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access pre_procurement_evaluations"
    ON assets.pre_procurement_evaluations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access purchase_requests"
    ON assets.purchase_requests FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access pr_items"
    ON assets.pr_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access purchase_orders"
    ON assets.purchase_orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access po_items"
    ON assets.po_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access po_amendments"
    ON assets.po_amendments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access suppliers"
    ON assets.suppliers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access supplier_quotations"
    ON assets.supplier_quotations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access quotation_items"
    ON assets.quotation_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access canvasses"
    ON assets.canvasses FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access canvass_suppliers"
    ON assets.canvass_suppliers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access delivery_receipts"
    ON assets.delivery_receipts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access delivery_items"
    ON assets.delivery_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access inspection_acceptance_reports"
    ON assets.inspection_acceptance_reports FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access iar_items"
    ON assets.iar_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access procurement_payments"
    ON assets.procurement_payments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access approval_workflows"
    ON assets.approval_workflows FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access approval_steps"
    ON assets.approval_steps FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access approval_action_logs"
    ON assets.approval_action_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access procurement_documents"
    ON assets.procurement_documents FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access notifications"
    ON assets.notifications FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can access audit_logs"
    ON assets.audit_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

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
