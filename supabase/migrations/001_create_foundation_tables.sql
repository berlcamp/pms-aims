-- ============================================================================
-- DIVISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.divisions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    province VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.schools (
    id BIGSERIAL PRIMARY KEY,
    division_id BIGINT NOT NULL REFERENCES procurements.divisions(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    school_id VARCHAR(50), -- DepEd School ID
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(division_id, code)
);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.roles (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('division', 'school', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL CHECK (module IN ('pms', 'aims', 'system')),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'print')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLE PERMISSIONS (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES procurements.roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES procurements.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- USERS TABLE (Extends Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.users (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
    division_id BIGINT REFERENCES procurements.divisions(id) ON DELETE SET NULL,
    school_id BIGINT REFERENCES procurements.schools(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(255),
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_division_or_school CHECK (
        (division_id IS NOT NULL AND school_id IS NULL) OR
        (division_id IS NULL AND school_id IS NOT NULL) OR
        (division_id IS NULL AND school_id IS NULL)
    )
);

-- ============================================================================
-- USER ROLES (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES procurements.users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES procurements.roles(id) ON DELETE CASCADE,
    division_id BIGINT REFERENCES procurements.divisions(id) ON DELETE CASCADE,
    school_id BIGINT REFERENCES procurements.schools(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by BIGINT REFERENCES procurements.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id, division_id, school_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_schools_division_id ON procurements.schools(division_id);
CREATE INDEX IF NOT EXISTS idx_schools_code ON procurements.schools(code);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON procurements.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON procurements.users(email);
CREATE INDEX IF NOT EXISTS idx_users_division_id ON procurements.users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON procurements.users(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON procurements.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON procurements.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON procurements.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON procurements.role_permissions(permission_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_divisions_updated_at
    BEFORE UPDATE ON procurements.divisions
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON procurements.schools
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON procurements.roles
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON procurements.users
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

-- ============================================================================
-- INSERT DEFAULT ROLES
-- ============================================================================
INSERT INTO procurements.roles (code, name, description, level) VALUES
    ('SDS', 'Schools Division Superintendent', 'Highest authority in the division', 'division'),
    ('ASST_SDS', 'Assistant SDS', 'Assistant to the SDS', 'division'),
    ('SUPPLY_OFFICER_DIV', 'Administrative Officer V (Supply Officer - Division)', 'Division-level supply officer', 'division'),
    ('BUDGET_OFFICER', 'Budget Officer', 'Manages budget and fund sources', 'division'),
    ('ACCOUNTING_OFFICER', 'Accounting Officer', 'Handles accounting and payment processing', 'division'),
    ('BAC_CHAIR', 'BAC Chairperson', 'Bids and Awards Committee Chairperson', 'division'),
    ('BAC_MEMBER', 'BAC Member', 'Bids and Awards Committee Member', 'division'),
    ('TECHNICAL_EVALUATOR', 'ICT / Technical Evaluator', 'Technical evaluation for ICT items', 'division'),
    ('SCHOOL_HEAD', 'School Head / Principal', 'School administrator', 'school'),
    ('SUPPLY_OFFICER_SCH', 'School Supply Officer', 'School-level supply officer', 'school'),
    ('DIVISION_STAFF', 'Division Staff / Requester', 'Division staff member', 'division'),
    ('SCHOOL_STAFF', 'School Staff / Teacher', 'School staff member', 'school')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE procurements.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do all on user_roles"
ON procurements.user_roles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);