-- ============================================================================
-- PPMP (PROCUREMENT PROGRAM AND MANAGEMENT PLAN) TABLES
-- ============================================================================

-- ============================================================================
-- PPMP MAIN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.ppmp (
    id BIGSERIAL PRIMARY KEY,
    
    -- PPMP Identification
    ppmp_number VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    ppmp_type VARCHAR(20) NOT NULL CHECK (ppmp_type IN ('INDICATIVE', 'FINAL')),
    version INTEGER NOT NULL DEFAULT 1,
    parent_ppmp_id BIGINT REFERENCES procurements.ppmp(id) ON DELETE SET NULL,
    basis_of_revision TEXT,
    
    -- Office/School Assignment
    division_id BIGINT NOT NULL REFERENCES procurements.divisions(id) ON DELETE RESTRICT,
    office_id BIGINT REFERENCES procurements.offices(id) ON DELETE RESTRICT,
    school_id BIGINT REFERENCES procurements.schools(id) ON DELETE RESTRICT,
    
    -- Project Information
    project_title VARCHAR(500) NOT NULL,
    general_description TEXT NOT NULL,
    objective TEXT NOT NULL,
    implementation_mode VARCHAR(20) NOT NULL CHECK (implementation_mode IN ('PROCUREMENT', 'BY_ADMINISTRATION')),
    
    -- Project Classification
    project_type VARCHAR(30) NOT NULL CHECK (project_type IN ('GOODS', 'INFRASTRUCTURE', 'CONSULTING_SERVICES')),
    is_general_support_services BOOLEAN DEFAULT false,
    
    -- Procurement Schedule
    suggested_mode_of_procurement VARCHAR(100),
    procurement_start_month INTEGER CHECK (procurement_start_month >= 1 AND procurement_start_month <= 12),
    procurement_start_year INTEGER,
    procurement_end_month INTEGER CHECK (procurement_end_month >= 1 AND procurement_end_month <= 12),
    procurement_end_year INTEGER,
    delivery_start_month INTEGER CHECK (delivery_start_month >= 1 AND delivery_start_month <= 12),
    delivery_start_year INTEGER,
    delivery_end_month INTEGER CHECK (delivery_end_month >= 1 AND delivery_end_month <= 12),
    delivery_end_year INTEGER,
    
    -- Budget & Funding
    source_of_funds VARCHAR(100) NOT NULL,
    total_budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estimated_budget NUMERIC(15, 2),
    authorized_budget NUMERIC(15, 2),
    budget_override_justification TEXT,
    
    -- Status & Workflow
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'FOR_APPROVAL',
        'APPROVED_BY_OFFICE',
        'SUBMITTED_TO_PROCUREMENT',
        'CONSOLIDATED',
        'RETURNED_FOR_REVISION'
    )),
    is_locked BOOLEAN DEFAULT false,
    
    -- Submission & Approval
    submitted_by BIGINT REFERENCES procurements.users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    approved_by BIGINT REFERENCES procurements.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    -- Remarks
    remarks TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT ppmp_office_or_school CHECK (
        (office_id IS NOT NULL AND school_id IS NULL) OR
        (office_id IS NULL AND school_id IS NOT NULL)
    ),
    CONSTRAINT ppmp_one_per_office_per_year UNIQUE (office_id, school_id, fiscal_year, version)
);

-- ============================================================================
-- PPMP LOTS TABLE (Optional lot grouping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.ppmp_lots (
    id BIGSERIAL PRIMARY KEY,
    ppmp_id BIGINT NOT NULL REFERENCES procurements.ppmp(id) ON DELETE CASCADE,
    lot_number INTEGER NOT NULL,
    lot_name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(ppmp_id, lot_number)
);

-- ============================================================================
-- PPMP ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.ppmp_items (
    id BIGSERIAL PRIMARY KEY,
    ppmp_id BIGINT NOT NULL REFERENCES procurements.ppmp(id) ON DELETE CASCADE,
    lot_id BIGINT REFERENCES procurements.ppmp_lots(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    size_specification TEXT,
    estimated_unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estimated_total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PPMP ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.ppmp_attachments (
    id BIGSERIAL PRIMARY KEY,
    ppmp_id BIGINT NOT NULL REFERENCES procurements.ppmp(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'MARKET_SCOPING_CHECKLIST',
        'TECHNICAL_SPECIFICATIONS',
        'TOR',
        'ENGINEERING_PLANS',
        'FEASIBILITY_STUDY',
        'OTHER'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by BIGINT REFERENCES procurements.users(id) ON DELETE SET NULL,
    is_required BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PPMP APPROVAL HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.ppmp_approval_history (
    id BIGSERIAL PRIMARY KEY,
    ppmp_id BIGINT NOT NULL REFERENCES procurements.ppmp(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'return', 'review', 'submit')),
    acted_by BIGINT NOT NULL REFERENCES procurements.users(id) ON DELETE RESTRICT,
    acted_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ppmp_division_id ON procurements.ppmp(division_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_office_id ON procurements.ppmp(office_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_school_id ON procurements.ppmp(school_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_fiscal_year ON procurements.ppmp(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ppmp_status ON procurements.ppmp(status);
CREATE INDEX IF NOT EXISTS idx_ppmp_submitted_by ON procurements.ppmp(submitted_by);
CREATE INDEX IF NOT EXISTS idx_ppmp_approved_by ON procurements.ppmp(approved_by);
CREATE INDEX IF NOT EXISTS idx_ppmp_parent_ppmp_id ON procurements.ppmp(parent_ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_lots_ppmp_id ON procurements.ppmp_lots(ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_items_ppmp_id ON procurements.ppmp_items(ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_items_lot_id ON procurements.ppmp_items(lot_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_attachments_ppmp_id ON procurements.ppmp_attachments(ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_approval_history_ppmp_id ON procurements.ppmp_approval_history(ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_approval_history_acted_by ON procurements.ppmp_approval_history(acted_by);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_ppmp_updated_at
    BEFORE UPDATE ON procurements.ppmp
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

CREATE TRIGGER update_ppmp_lots_updated_at
    BEFORE UPDATE ON procurements.ppmp_lots
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

CREATE TRIGGER update_ppmp_items_updated_at
    BEFORE UPDATE ON procurements.ppmp_items
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Generate PPMP Number
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.generate_ppmp_number(
    p_office_id BIGINT,
    p_school_id BIGINT,
    p_fiscal_year INTEGER
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_sequence_number INTEGER;
    v_office_code VARCHAR(50);
    v_school_code VARCHAR(50);
    v_prefix VARCHAR(10);
BEGIN
    -- Get office or school code
    IF p_office_id IS NOT NULL THEN
        SELECT code INTO v_office_code
        FROM procurements.offices
        WHERE id = p_office_id;
        v_prefix := COALESCE(v_office_code, 'OFF');
    ELSIF p_school_id IS NOT NULL THEN
        SELECT code INTO v_school_code
        FROM procurements.schools
        WHERE id = p_school_id;
        v_prefix := COALESCE(v_school_code, 'SCH');
    ELSE
        v_prefix := 'PPMP';
    END IF;
    
    -- Get the next sequence number for this office/school and fiscal year
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_sequence_number
    FROM procurements.ppmp
    WHERE (office_id = p_office_id OR (office_id IS NULL AND p_office_id IS NULL))
      AND (school_id = p_school_id OR (school_id IS NULL AND p_school_id IS NULL))
      AND fiscal_year = p_fiscal_year;
    
    -- Return formatted PPMP number: "No. {sequence_number}"
    RETURN 'No. ' || v_sequence_number::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Create PPMP permissions
INSERT INTO procurements.permissions (code, name, description, module, resource, action) VALUES
    ('pms.ppmp.create', 'Create PPMP', 'Create new Procurement Program and Management Plan', 'pms', 'ppmp', 'create'),
    ('pms.ppmp.read', 'View PPMP', 'View Procurement Program and Management Plan', 'pms', 'ppmp', 'read'),
    ('pms.ppmp.update', 'Edit PPMP', 'Edit Procurement Program and Management Plan', 'pms', 'ppmp', 'update'),
    ('pms.ppmp.approve', 'Approve PPMP', 'Approve Procurement Program and Management Plan', 'pms', 'ppmp', 'approve'),
    ('pms.ppmp.review', 'Review PPMP', 'Review Procurement Program and Management Plan', 'pms', 'ppmp', 'read'),
    ('pms.ppmp.print', 'Print PPMP', 'Print Procurement Program and Management Plan', 'pms', 'ppmp', 'print')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
-- SCHOOL_STAFF and DIVISION_STAFF: create, read, update
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_create_id BIGINT;
    v_perm_read_id BIGINT;
    v_perm_update_id BIGINT;
BEGIN
    -- Get role IDs
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'SCHOOL_STAFF';
    IF v_role_id IS NOT NULL THEN
        SELECT id INTO v_perm_create_id FROM procurements.permissions WHERE code = 'pms.ppmp.create';
        SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.ppmp.read';
        SELECT id INTO v_perm_update_id FROM procurements.permissions WHERE code = 'pms.ppmp.update';
        
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_create_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_create_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_update_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_update_id
        );
    END IF;
    
    -- Same for DIVISION_STAFF
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'DIVISION_STAFF';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_create_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_create_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_update_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_update_id
        );
    END IF;
END $$;

-- SCHOOL_HEAD: create, read, update, approve
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_create_id BIGINT;
    v_perm_read_id BIGINT;
    v_perm_update_id BIGINT;
    v_perm_approve_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'SCHOOL_HEAD';
    IF v_role_id IS NOT NULL THEN
        SELECT id INTO v_perm_create_id FROM procurements.permissions WHERE code = 'pms.ppmp.create';
        SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.ppmp.read';
        SELECT id INTO v_perm_update_id FROM procurements.permissions WHERE code = 'pms.ppmp.update';
        SELECT id INTO v_perm_approve_id FROM procurements.permissions WHERE code = 'pms.ppmp.approve';
        
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_create_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_create_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_update_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_update_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_approve_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_approve_id
        );
    END IF;
END $$;

-- SUPPLY_OFFICER_DIV and SUPPLY_OFFICER_SCH: read, review
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_read_id BIGINT;
    v_perm_review_id BIGINT;
BEGIN
    -- SUPPLY_OFFICER_DIV
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'SUPPLY_OFFICER_DIV';
    IF v_role_id IS NOT NULL THEN
        SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.ppmp.read';
        SELECT id INTO v_perm_review_id FROM procurements.permissions WHERE code = 'pms.ppmp.review';
        
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_review_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_review_id
        );
    END IF;
    
    -- SUPPLY_OFFICER_SCH
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'SUPPLY_OFFICER_SCH';
    IF v_role_id IS NOT NULL THEN
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
        );
        INSERT INTO procurements.role_permissions (role_id, permission_id)
        SELECT v_role_id, v_perm_review_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_review_id
        );
    END IF;
END $$;
