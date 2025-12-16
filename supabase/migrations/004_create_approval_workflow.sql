-- Migration: 004_create_approval_workflow.sql
-- Description: Creates approval workflow engine tables
-- Schema: assets

-- ============================================================================
-- APPROVAL WORKFLOWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    workflow_type VARCHAR(100) NOT NULL,
    current_stage INTEGER NOT NULL DEFAULT 1,
    total_stages INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'returned', 'cancelled'
    )),
    initiated_by UUID NOT NULL REFERENCES assets.users(id),
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- ============================================================================
-- APPROVAL STEPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.approval_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES assets.approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES assets.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'returned', 'cancelled'
    )),
    action VARCHAR(50) CHECK (action IN ('approve', 'reject', 'return', 'forward', 'cancel')),
    remarks TEXT,
    acted_by UUID REFERENCES assets.users(id),
    acted_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, step_number)
);

-- ============================================================================
-- APPROVAL ACTION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.approval_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES assets.approval_steps(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES assets.approval_workflows(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'reject', 'return', 'forward', 'cancel')),
    remarks TEXT NOT NULL,
    acted_by UUID NOT NULL REFERENCES assets.users(id),
    acted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workflows_entity ON assets.approval_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON assets.approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_initiated_by ON assets.approval_workflows(initiated_by);
CREATE INDEX IF NOT EXISTS idx_steps_workflow_id ON assets.approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_steps_status ON assets.approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_steps_role_code ON assets.approval_steps(role_code);
CREATE INDEX IF NOT EXISTS idx_steps_user_id ON assets.approval_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_step_id ON assets.approval_action_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_workflow_id ON assets.approval_action_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_acted_by ON assets.approval_action_logs(acted_by);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON assets.approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

CREATE TRIGGER update_steps_updated_at
    BEFORE UPDATE ON assets.approval_steps
    FOR EACH ROW
    EXECUTE FUNCTION assets.update_updated_at_column();

-- ============================================================================
-- WORKFLOW HELPER FUNCTIONS
-- ============================================================================

-- Function to get next pending step for a workflow
CREATE OR REPLACE FUNCTION assets.get_next_pending_step(p_workflow_id UUID)
RETURNS TABLE (
    step_id UUID,
    step_number INTEGER,
    role_code VARCHAR,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.step_number,
        s.role_code,
        s.user_id
    FROM assets.approval_steps s
    WHERE s.workflow_id = p_workflow_id
    AND s.status = 'pending'
    ORDER BY s.step_number ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can act on a workflow step
CREATE OR REPLACE FUNCTION assets.can_user_act_on_step(
    p_user_id UUID,
    p_step_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_step_role_code VARCHAR;
    v_user_has_role BOOLEAN;
BEGIN
    -- Get the role required for this step
    SELECT role_code INTO v_step_role_code
    FROM assets.approval_steps
    WHERE id = p_step_id;
    
    -- Check if user has this role
    SELECT EXISTS (
        SELECT 1
        FROM assets.user_roles ur
        JOIN assets.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
        AND ur.is_active = true
        AND r.code = v_step_role_code
    ) INTO v_user_has_role;
    
    RETURN v_user_has_role;
END;
$$ LANGUAGE plpgsql;
