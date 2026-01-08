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
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_schools_division_id ON procurements.schools(division_id);
CREATE INDEX IF NOT EXISTS idx_schools_code ON procurements.schools(code);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON procurements.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON procurements.users(email);
CREATE INDEX IF NOT EXISTS idx_users_division_id ON procurements.users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON procurements.users(school_id);

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

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON procurements.users
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();
