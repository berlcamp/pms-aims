-- ============================================================================
-- DROP ROLES AND PERMISSIONS SYSTEM
-- ============================================================================
-- This migration drops all roles and permissions related tables and objects
-- in the correct order to handle foreign key dependencies.

-- ============================================================================
-- DROP JUNCTION TABLES (with foreign keys)
-- ============================================================================

-- Drop role_permissions table (junction table between roles and permissions)
DROP TABLE IF EXISTS procurements.role_permissions CASCADE;

-- Drop user_roles table (junction table between users and roles)
DROP TABLE IF EXISTS procurements.user_roles CASCADE;

-- ============================================================================
-- DROP MAIN TABLES
-- ============================================================================

-- Drop permissions table
DROP TABLE IF EXISTS procurements.permissions CASCADE;

-- Drop roles table
DROP TABLE IF EXISTS procurements.roles CASCADE;

-- ============================================================================
-- DROP RELATED FUNCTIONS (if any exist)
-- ============================================================================
-- Note: Add any custom functions related to roles/permissions here if they exist

-- ============================================================================
-- DROP RELATED TRIGGERS (if any exist)
-- ============================================================================
-- Note: Add any triggers related to roles/permissions here if they exist

-- ============================================================================
-- DROP RELATED INDEXES (if any exist)
-- ============================================================================
-- Note: Indexes are automatically dropped when tables are dropped,
-- but if there are any standalone indexes, drop them here

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify the drops, you can run:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'procurements' 
-- AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles');

