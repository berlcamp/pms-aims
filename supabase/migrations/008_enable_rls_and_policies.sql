-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
-- This migration enables RLS on all tables and creates an "All" policy
-- for authenticated users that allows all operations (SELECT, INSERT, UPDATE, DELETE)

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE procurements.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.ppmp ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.ppmp_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.ppmp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.ppmp_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.ppmp_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurements.lasa_rows ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE "All" POLICY FOR AUTHENTICATED USERS
-- ============================================================================
-- This policy allows authenticated users to perform all operations (SELECT, INSERT, UPDATE, DELETE)
-- on all tables. The policy uses auth.uid() to check if the user is authenticated.

-- Divisions
CREATE POLICY "All" ON procurements.divisions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Schools
CREATE POLICY "All" ON procurements.schools
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Users
CREATE POLICY "All" ON procurements.users
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Offices
CREATE POLICY "All" ON procurements.offices
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PPMP
CREATE POLICY "All" ON procurements.ppmp
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PPMP Lots
CREATE POLICY "All" ON procurements.ppmp_lots
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PPMP Items
CREATE POLICY "All" ON procurements.ppmp_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PPMP Attachments
CREATE POLICY "All" ON procurements.ppmp_attachments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PPMP Approval History
CREATE POLICY "All" ON procurements.ppmp_approval_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- LASA Rows
CREATE POLICY "All" ON procurements.lasa_rows
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

