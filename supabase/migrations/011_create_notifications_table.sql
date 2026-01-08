-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Generic notification system for all modules (PPMP, LASA, PR, PO, etc.)

CREATE TABLE IF NOT EXISTS procurements.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES procurements.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'proponent_assigned', 'approval_request', 'ppmp_approved', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(100), -- e.g., 'lasa_row', 'ppmp', 'purchase_request', etc.
    entity_id BIGINT, -- ID of the related entity
    metadata JSONB, -- Additional data as JSON (e.g., { "fiscal_year": 2025, "amount": 100000 })
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON procurements.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON procurements.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON procurements.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON procurements.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON procurements.notifications(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON procurements.notifications
    FOR EACH ROW
    EXECUTE FUNCTION procurements.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Create notification
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.create_notification(
    p_user_id BIGINT,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_entity_type VARCHAR(100) DEFAULT NULL,
    p_entity_id BIGINT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS procurements.notifications 
SECURITY DEFINER
AS $$
DECLARE
    v_notification procurements.notifications;
BEGIN
    INSERT INTO procurements.notifications (
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        p_metadata
    )
    RETURNING * INTO v_notification;
    
    RETURN v_notification;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark notification as read
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.mark_notification_read(
    p_notification_id BIGINT,
    p_user_id BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE procurements.notifications
    SET is_read = true,
        read_at = NOW()
    WHERE id = p_notification_id
      AND user_id = p_user_id
      AND is_read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark all notifications as read for user
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.mark_all_notifications_read(
    p_user_id BIGINT
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE procurements.notifications
    SET is_read = true,
        read_at = NOW()
    WHERE user_id = p_user_id
      AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Delete notification
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.delete_notification(
    p_notification_id BIGINT,
    p_user_id BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM procurements.notifications
    WHERE id = p_notification_id
      AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Create notification when proponent is assigned to LASA row
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.notify_proponent_assigned()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    v_proponent_name VARCHAR(255);
BEGIN
    -- Only create notification if proponent_id changed from NULL to a value
    -- or changed from one user to another
    IF NEW.proponent_id IS NOT NULL AND (
        OLD.proponent_id IS NULL OR 
        OLD.proponent_id != NEW.proponent_id
    ) THEN
        -- Get proponent name for the message
        SELECT name INTO v_proponent_name
        FROM procurements.users
        WHERE id = NEW.proponent_id;
        
        -- Create notification for the proponent
        PERFORM procurements.create_notification(
            p_user_id := NEW.proponent_id,
            p_type := 'proponent_assigned',
            p_title := 'Assigned as Proponent',
            p_message := format('You have been assigned as proponent for LASA project: %s', NEW.project_title),
            p_entity_type := 'lasa_row',
            p_entity_id := NEW.id,
            p_metadata := jsonb_build_object(
                'project_title', NEW.project_title,
                'fiscal_year', NEW.fiscal_year,
                'fund_source', NEW.fund_source,
                'planned_amount', NEW.planned_amount
            )
        );
    END IF;
    
    -- If proponent was removed (changed from a value to NULL), we could create a notification
    -- but typically we just delete/update the existing notification
    -- For now, we'll handle removal by deleting related notifications
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lasa_row_proponent_assigned_notification
    AFTER INSERT OR UPDATE OF proponent_id ON procurements.lasa_rows
    FOR EACH ROW
    WHEN (NEW.proponent_id IS NOT NULL)
    EXECUTE FUNCTION procurements.notify_proponent_assigned();

-- ============================================================================
-- TRIGGER: Delete notification when proponent is removed from LASA row
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.notify_proponent_removed()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
    -- If proponent_id changed from a value to NULL or different user
    IF OLD.proponent_id IS NOT NULL AND (
        NEW.proponent_id IS NULL OR 
        NEW.proponent_id != OLD.proponent_id
    ) THEN
        -- Delete existing notification for the old proponent
        DELETE FROM procurements.notifications
        WHERE user_id = OLD.proponent_id
          AND type = 'proponent_assigned'
          AND entity_type = 'lasa_row'
          AND entity_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lasa_row_proponent_removed_notification
    AFTER UPDATE OF proponent_id ON procurements.lasa_rows
    FOR EACH ROW
    WHEN (OLD.proponent_id IS NOT NULL AND (NEW.proponent_id IS NULL OR NEW.proponent_id != OLD.proponent_id))
    EXECUTE FUNCTION procurements.notify_proponent_removed();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE procurements.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON procurements.notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM procurements.users WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert notifications (for system use)
CREATE POLICY "System can create notifications" ON procurements.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update own notifications" ON procurements.notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM procurements.users WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM procurements.users WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON procurements.notifications
    FOR DELETE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM procurements.users WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE procurements.notifications IS 'Generic notification system for all modules';
COMMENT ON COLUMN procurements.notifications.type IS 'Notification type identifier (e.g., proponent_assigned, approval_request, ppmp_approved)';
COMMENT ON COLUMN procurements.notifications.entity_type IS 'Type of entity this notification relates to (e.g., lasa_row, ppmp, purchase_request)';
COMMENT ON COLUMN procurements.notifications.entity_id IS 'ID of the related entity';
COMMENT ON COLUMN procurements.notifications.metadata IS 'Additional data stored as JSON for flexible notification data';

