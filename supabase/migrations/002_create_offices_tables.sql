-- ============================================================================
-- OFFICES / END-USER UNITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS procurements.offices (
    id BIGSERIAL PRIMARY KEY,
    division_id BIGINT NOT NULL
        REFERENCES procurements.divisions(id) ON DELETE CASCADE,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,

    office_type VARCHAR(20) NOT NULL
        CHECK (office_type IN ('division_office', 'school')),

    school_id BIGINT
        REFERENCES procurements.schools(id) ON DELETE CASCADE,

    head_user_id BIGINT
        REFERENCES procurements.users(id) ON DELETE SET NULL,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (division_id, code),

    CONSTRAINT offices_school_logic CHECK (
        (office_type = 'division_office' AND school_id IS NULL) OR
        (office_type = 'school' AND school_id IS NOT NULL)
    )
);