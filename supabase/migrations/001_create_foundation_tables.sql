-- Migration: 001_create_foundation_tables.sql
-- Description: Creates core foundation tables for multi-tenant structure, users, roles, and permissions
-- Schema: assets

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS assets;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DIVISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.divisions (
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
CREATE TABLE IF NOT EXISTS assets.schools (
    id BIGSERIAL PRIMARY KEY,
    division_id BIGINT NOT NULL REFERENCES assets.divisions(id) ON DELETE RESTRICT,
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
CREATE TABLE IF NOT EXISTS assets.roles (
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
CREATE TABLE IF NOT EXISTS assets.permissions (
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
CREATE TABLE IF NOT EXISTS assets.role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES assets.roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES assets.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- USERS TABLE (Extends Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.users (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
    division_id BIGINT REFERENCES assets.divisions(id) ON DELETE SET NULL,
    school_id BIGINT REFERENCES assets.schools(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS assets.user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES assets.roles(id) ON DELETE CASCADE,
    division_id BIGINT REFERENCES assets.divisions(id) ON DELETE CASCADE,
    school_id BIGINT REFERENCES assets.schools(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by BIGINT REFERENCES assets.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id, division_id, school_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_schools_division_id ON assets.schools(division_id);
CREATE INDEX IF NOT EXISTS idx_schools_code ON assets.schools(code);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON assets.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON assets.users(email);
CREATE INDEX IF NOT EXISTS idx_users_division_id ON assets.users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON assets.users(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON assets.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON assets.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON assets.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON assets.role_permissions(permission_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_divisions_updated_at
    BEFORE UPDATE ON assets.divisions
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON assets.schools
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON assets.roles
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON assets.users
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

-- ============================================================================
-- INSERT DEFAULT ROLES
-- ============================================================================
INSERT INTO assets.roles (code, name, description, level) VALUES
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
