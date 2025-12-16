-- Migration: 005_create_supplier_management.sql
-- Description: Creates supplier management and canvassing tables
-- Schema: assets

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    tin VARCHAR(50), -- Tax Identification Number
    business_name VARCHAR(255),
    address TEXT,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    fax VARCHAR(20),
    philgeps_registration_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    performance_rating NUMERIC(3, 2) CHECK (performance_rating BETWEEN 1 AND 5),
    total_orders INTEGER DEFAULT 0,
    on_time_delivery_rate NUMERIC(5, 2) CHECK (on_time_delivery_rate BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- SUPPLIER QUOTATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.supplier_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES assets.suppliers(id) ON DELETE RESTRICT,
    canvass_id UUID, -- Will reference canvasses table (created later)
    quotation_number VARCHAR(100),
    quotation_date DATE NOT NULL,
    valid_until DATE,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    delivery_days INTEGER,
    payment_terms TEXT,
    document_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUOTATION ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES assets.supplier_quotations(id) ON DELETE CASCADE,
    item_name VARCHAR(500) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    brand VARCHAR(255),
    model VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CANVASSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.canvasses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvass_number VARCHAR(50) UNIQUE NOT NULL,
    pr_id UUID NOT NULL, -- Will reference purchase_requests (created in 003)
    division_id UUID NOT NULL REFERENCES assets.divisions(id) ON DELETE RESTRICT,
    school_id UUID REFERENCES assets.schools(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'quotation_received', 'under_evaluation', 'completed', 'cancelled'
    )),
    sent_date DATE,
    deadline_date DATE,
    evaluated_by UUID REFERENCES assets.users(id),
    evaluated_at TIMESTAMPTZ,
    recommended_supplier_id UUID REFERENCES assets.suppliers(id),
    recommendation_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CANVASS SUPPLIERS (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.canvass_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvass_id UUID NOT NULL REFERENCES assets.canvasses(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES assets.suppliers(id) ON DELETE RESTRICT,
    quotation_id UUID REFERENCES assets.supplier_quotations(id) ON DELETE SET NULL,
    is_recommended BOOLEAN DEFAULT false,
    score NUMERIC(5, 2),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canvass_id, supplier_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON assets.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON assets.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_tin ON assets.suppliers(tin);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON assets.suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier_id ON assets.supplier_quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotations_canvass_id ON assets.supplier_quotations(canvass_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON assets.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_canvasses_pr_id ON assets.canvasses(pr_id);
CREATE INDEX IF NOT EXISTS idx_canvasses_status ON assets.canvasses(status);
CREATE INDEX IF NOT EXISTS idx_canvass_suppliers_canvass_id ON assets.canvass_suppliers(canvass_id);
CREATE INDEX IF NOT EXISTS idx_canvass_suppliers_supplier_id ON assets.canvass_suppliers(supplier_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON assets.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON assets.supplier_quotations
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_canvasses_updated_at
    BEFORE UPDATE ON assets.canvasses
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Add after PR table exists)
-- ============================================================================
-- Note: These will be added in a later migration or can be added manually
-- ALTER TABLE assets.canvasses ADD CONSTRAINT fk_canvasses_pr_id 
--     FOREIGN KEY (pr_id) REFERENCES assets.purchase_requests(id) ON DELETE RESTRICT;

-- ============================================================================
-- UPDATE QUOTATION CANVASS_ID TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.update_quotation_canvass_id()
RETURNS TRIGGER AS $$
BEGIN
    -- When a quotation is linked to a canvass_supplier, update the quotation's canvass_id
    IF NEW.quotation_id IS NOT NULL THEN
        UPDATE assets.supplier_quotations
        SET canvass_id = NEW.canvass_id
        WHERE id = NEW.quotation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotation_canvass_id
    AFTER INSERT OR UPDATE ON assets.canvass_suppliers
    FOR EACH ROW
    WHEN (NEW.quotation_id IS NOT NULL)
    EXECUTE FUNCTION assets.update_quotation_canvass_id();
