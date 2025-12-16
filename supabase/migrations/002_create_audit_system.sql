-- Migration: 002_create_audit_system.sql
-- Description: Creates audit trail system with triggers for COA compliance
-- Schema: assets

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create', 'update', 'delete', 'approve', 'reject', 'return', 
        'forward', 'cancel', 'print', 'export', 'login', 'logout'
    )),
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changes JSONB, -- Structured changes: {"field": {"old": value, "new": value}}
    ip_address INET,
    user_agent TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR AUDIT LOGS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON assets.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON assets.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON assets.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON assets.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_created_at ON assets.audit_logs(entity_type, created_at DESC);

-- ============================================================================
-- AUDIT LOGGING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.log_audit(
    p_user_id BIGINT,
    p_action_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id BIGINT,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_audit_id BIGINT;
BEGIN
    INSERT INTO assets.audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_value,
        new_value,
        changes,
        remarks
    ) VALUES (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_old_value,
        p_new_value,
        p_changes,
        p_remarks
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.create_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id BIGINT;
    v_changes JSONB := '{}'::JSONB;
    v_key TEXT;
BEGIN
    -- Get current user ID from JWT or session
    -- For now, we'll use a function to get it from auth context
    -- In production, this should be set via application context
    v_user_id := current_setting('app.current_user_id', true)::BIGINT;
    
    -- If no user_id in context, try to get from auth.users
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM assets.users 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;
    
    -- Skip audit if no user found (shouldn't happen in normal operation)
    IF v_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        PERFORM assets.log_audit(
            v_user_id,
            'create',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            to_jsonb(NEW),
            NULL,
            'Record created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Calculate changes
        FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
            IF to_jsonb(NEW)->>v_key IS DISTINCT FROM to_jsonb(OLD)->>v_key THEN
                v_changes := v_changes || jsonb_build_object(
                    v_key,
                    jsonb_build_object(
                        'old', to_jsonb(OLD)->>v_key,
                        'new', to_jsonb(NEW)->>v_key
                    )
                );
            END IF;
        END LOOP;
        
        PERFORM assets.log_audit(
            v_user_id,
            'update',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changes,
            'Record updated'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM assets.log_audit(
            v_user_id,
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            NULL,
            NULL,
            'Record deleted'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO SET CURRENT USER CONTEXT
-- ============================================================================
CREATE OR REPLACE FUNCTION assets.set_current_user(p_user_id BIGINT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY FOR AUDIT LOGS
-- ============================================================================
ALTER TABLE assets.audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for audit_logs are created in migration 007
