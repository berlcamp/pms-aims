-- Migration: 006_create_delivery_inspection.sql
-- Description: Creates delivery receipt and inspection & acceptance report tables
-- Schema: assets

-- ============================================================================
-- PURCHASE ORDERS (PO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    pr_id UUID NOT NULL REFERENCES assets.purchase_requests(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES assets.suppliers(id) ON DELETE RESTRICT,
    division_id UUID NOT NULL REFERENCES assets.divisions(id) ON DELETE RESTRICT,
    school_id UUID REFERENCES assets.schools(id) ON DELETE RESTRICT,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    delivery_address TEXT NOT NULL,
    delivery_terms TEXT,
    payment_terms TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_supply_officer', 'pending_bac_chair', 'pending_sds',
        'approved', 'rejected', 'cancelled', 'amended'
    )),
    current_approval_stage INTEGER NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES assets.users(id),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    parent_po_id UUID REFERENCES assets.purchase_orders(id) ON DELETE SET NULL,
    amendment_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PO ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.po_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES assets.purchase_orders(id) ON DELETE CASCADE,
    pr_item_id UUID REFERENCES assets.pr_items(id) ON DELETE SET NULL,
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
-- PO AMENDMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.po_amendments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES assets.purchase_orders(id) ON DELETE CASCADE,
    amendment_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    changes JSONB NOT NULL,
    requested_by UUID NOT NULL REFERENCES assets.users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES assets.users(id),
    approved_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(po_id, amendment_number)
);

-- ============================================================================
-- DELIVERY RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.delivery_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dr_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL REFERENCES assets.purchase_orders(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES assets.suppliers(id) ON DELETE RESTRICT,
    delivery_date DATE NOT NULL,
    received_by UUID REFERENCES assets.users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'partial', 'complete', 'overdue', 'cancelled'
    )),
    remarks TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DELIVERY ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.delivery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dr_id UUID NOT NULL REFERENCES assets.delivery_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES assets.po_items(id) ON DELETE RESTRICT,
    quantity_delivered NUMERIC(10, 2) NOT NULL,
    quantity_accepted NUMERIC(10, 2),
    quantity_rejected NUMERIC(10, 2),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSPECTION & ACCEPTANCE REPORTS (IAR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.inspection_acceptance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iar_number VARCHAR(50) UNIQUE NOT NULL,
    dr_id UUID NOT NULL REFERENCES assets.delivery_receipts(id) ON DELETE RESTRICT,
    po_id UUID NOT NULL REFERENCES assets.purchase_orders(id) ON DELETE RESTRICT,
    inspected_by UUID REFERENCES assets.users(id),
    inspection_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_inspection', 'accepted', 'partially_accepted', 'rejected', 'cancelled'
    )),
    inspection_remarks TEXT,
    acceptance_remarks TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- IAR ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.iar_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iar_id UUID NOT NULL REFERENCES assets.inspection_acceptance_reports(id) ON DELETE CASCADE,
    delivery_item_id UUID NOT NULL REFERENCES assets.delivery_items(id) ON DELETE RESTRICT,
    quantity_accepted NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantity_rejected NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rejection_reason TEXT,
    condition VARCHAR(50) CHECK (condition IN ('good', 'defective', 'damaged', 'incomplete')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCUREMENT PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES assets.purchase_orders(id) ON DELETE RESTRICT,
    iar_id UUID REFERENCES assets.inspection_acceptance_reports(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'obr_attached', 'dv_attached', 'forwarded_to_accounting', 'paid', 'cancelled'
    )),
    obr_number VARCHAR(100),
    obr_document_url TEXT,
    dv_number VARCHAR(100),
    dv_document_url TEXT,
    forwarded_to_accounting_at TIMESTAMPTZ,
    forwarded_by UUID REFERENCES assets.users(id),
    payment_date DATE,
    payment_reference VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_po_pr_id ON assets.purchase_orders(pr_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON assets.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON assets.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number ON assets.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON assets.po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_pr_item_id ON assets.po_items(pr_item_id);
CREATE INDEX IF NOT EXISTS idx_po_amendments_po_id ON assets.po_amendments(po_id);
CREATE INDEX IF NOT EXISTS idx_dr_po_id ON assets.delivery_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_dr_supplier_id ON assets.delivery_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dr_status ON assets.delivery_receipts(status);
CREATE INDEX IF NOT EXISTS idx_dr_number ON assets.delivery_receipts(dr_number);
CREATE INDEX IF NOT EXISTS idx_delivery_items_dr_id ON assets.delivery_items(dr_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_po_item_id ON assets.delivery_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_iar_dr_id ON assets.inspection_acceptance_reports(dr_id);
CREATE INDEX IF NOT EXISTS idx_iar_po_id ON assets.inspection_acceptance_reports(po_id);
CREATE INDEX IF NOT EXISTS idx_iar_status ON assets.inspection_acceptance_reports(status);
CREATE INDEX IF NOT EXISTS idx_iar_number ON assets.inspection_acceptance_reports(iar_number);
CREATE INDEX IF NOT EXISTS idx_iar_items_iar_id ON assets.iar_items(iar_id);
CREATE INDEX IF NOT EXISTS idx_iar_items_delivery_item_id ON assets.iar_items(delivery_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_po_id ON assets.procurement_payments(po_id);
CREATE INDEX IF NOT EXISTS idx_payments_iar_id ON assets.procurement_payments(iar_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON assets.procurement_payments(status);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_po_updated_at
    BEFORE UPDATE ON assets.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_po_items_updated_at
    BEFORE UPDATE ON assets.po_items
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_dr_updated_at
    BEFORE UPDATE ON assets.delivery_receipts
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_delivery_items_updated_at
    BEFORE UPDATE ON assets.delivery_items
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_iar_updated_at
    BEFORE UPDATE ON assets.inspection_acceptance_reports
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON assets.procurement_payments
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

-- ============================================================================
-- ADD FOREIGN KEY FOR CANVASSES.PR_ID
-- ============================================================================
ALTER TABLE assets.canvasses 
    ADD CONSTRAINT fk_canvasses_pr_id 
    FOREIGN KEY (pr_id) REFERENCES assets.purchase_requests(id) ON DELETE RESTRICT;
