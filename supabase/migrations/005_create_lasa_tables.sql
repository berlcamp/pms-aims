-- ============================================================================
-- LASA (BUDGET VISIBILITY & PLANNING) TABLES
-- ============================================================================

-- ============================================================================
-- LASA ROWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.lasa_rows (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core Identification
    division_id BIGINT NOT NULL REFERENCES procurements.divisions(id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    row_type VARCHAR(20) NOT NULL CHECK (row_type IN ('MANUAL', 'PPMP_PROJECT')),
    
    -- Office/School Assignment (optional for MANUAL rows)
    office_id BIGINT REFERENCES procurements.offices(id) ON DELETE RESTRICT,
    
    -- Project Information
    project_title VARCHAR(500) NOT NULL,
    fund_source VARCHAR(100) NOT NULL,
    planned_amount NUMERIC(15, 2) DEFAULT 0,
    
    -- PPMP Link (required for PPMP_PROJECT rows)
    ppmp_version_id BIGINT REFERENCES procurements.ppmp(id) ON DELETE RESTRICT,
    
    -- Locking (PPMP_PROJECT rows are always locked)
    is_locked BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit
    created_by BIGINT NOT NULL REFERENCES procurements.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lasa_ppmp_link_required CHECK (
        (row_type = 'PPMP_PROJECT' AND ppmp_version_id IS NOT NULL) OR
        (row_type = 'MANUAL' AND ppmp_version_id IS NULL)
    ),
    CONSTRAINT lasa_ppmp_locked CHECK (
        (row_type = 'PPMP_PROJECT' AND is_locked = true) OR
        (row_type = 'MANUAL')
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lasa_rows_division_id ON procurements.lasa_rows(division_id);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_fiscal_year ON procurements.lasa_rows(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_office_id ON procurements.lasa_rows(office_id);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_row_type ON procurements.lasa_rows(row_type);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_ppmp_version_id ON procurements.lasa_rows(ppmp_version_id);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_fund_source ON procurements.lasa_rows(fund_source);
CREATE INDEX IF NOT EXISTS idx_lasa_rows_created_by ON procurements.lasa_rows(created_by);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_lasa_rows_updated_at
    BEFORE UPDATE ON procurements.lasa_rows
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

-- ============================================================================
-- TRIGGER: Enforce is_locked for PPMP_PROJECT rows
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.enforce_lasa_locked()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure PPMP_PROJECT rows are always locked
    IF NEW.row_type = 'PPMP_PROJECT' THEN
        NEW.is_locked = true;
    END IF;
    
    -- Prevent unlocking PPMP_PROJECT rows
    IF OLD.row_type = 'PPMP_PROJECT' AND NEW.is_locked = false THEN
        RAISE EXCEPTION 'Cannot unlock PPMP_PROJECT rows';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_lasa_locked_trigger
    BEFORE INSERT OR UPDATE ON procurements.lasa_rows
    FOR EACH ROW
    EXECUTE FUNCTION procurements.enforce_lasa_locked();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Create LASA permissions
INSERT INTO procurements.permissions (code, name, description, module, resource, action) VALUES
    ('pms.lasa.create', 'Create LASA Row', 'Create new LASA (budget visibility) row', 'pms', 'lasa', 'create'),
    ('pms.lasa.read', 'View LASA Row', 'View LASA (budget visibility) rows', 'pms', 'lasa', 'read'),
    ('pms.lasa.update', 'Edit LASA Row', 'Edit LASA (budget visibility) row', 'pms', 'lasa', 'update'),
    ('pms.lasa.delete', 'Delete LASA Row', 'Delete LASA (budget visibility) row', 'pms', 'lasa', 'delete')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
-- BUDGET_OFFICER: create, read, update, delete (for MANUAL rows only)
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_create_id BIGINT;
    v_perm_read_id BIGINT;
    v_perm_update_id BIGINT;
    v_perm_delete_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM procurements.roles WHERE code = 'BUDGET_OFFICER';
    IF v_role_id IS NOT NULL THEN
        SELECT id INTO v_perm_create_id FROM procurements.permissions WHERE code = 'pms.lasa.create';
        SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.lasa.read';
        SELECT id INTO v_perm_update_id FROM procurements.permissions WHERE code = 'pms.lasa.update';
        SELECT id INTO v_perm_delete_id FROM procurements.permissions WHERE code = 'pms.lasa.delete';
        
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
        SELECT v_role_id, v_perm_delete_id WHERE NOT EXISTS (
            SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_delete_id
        );
    END IF;
END $$;

-- SCHOOL_STAFF, DIVISION_STAFF, SCHOOL_HEAD: read only
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_read_id BIGINT;
    v_role_codes TEXT[] := ARRAY['SCHOOL_STAFF', 'DIVISION_STAFF', 'SCHOOL_HEAD'];
    v_role_code TEXT;
BEGIN
    SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.lasa.read';
    
    FOREACH v_role_code IN ARRAY v_role_codes
    LOOP
        SELECT id INTO v_role_id FROM procurements.roles WHERE code = v_role_code;
        IF v_role_id IS NOT NULL THEN
            INSERT INTO procurements.role_permissions (role_id, permission_id)
            SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
                SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
            );
        END IF;
    END LOOP;
END $$;

-- SUPPLY_OFFICER_DIV, SUPPLY_OFFICER_SCH: read only (for awareness)
DO $$
DECLARE
    v_role_id BIGINT;
    v_perm_read_id BIGINT;
    v_role_codes TEXT[] := ARRAY['SUPPLY_OFFICER_DIV', 'SUPPLY_OFFICER_SCH'];
    v_role_code TEXT;
BEGIN
    SELECT id INTO v_perm_read_id FROM procurements.permissions WHERE code = 'pms.lasa.read';
    
    FOREACH v_role_code IN ARRAY v_role_codes
    LOOP
        SELECT id INTO v_role_id FROM procurements.roles WHERE code = v_role_code;
        IF v_role_id IS NOT NULL THEN
            INSERT INTO procurements.role_permissions (role_id, permission_id)
            SELECT v_role_id, v_perm_read_id WHERE NOT EXISTS (
                SELECT 1 FROM procurements.role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_read_id
            );
        END IF;
    END LOOP;
END $$;
