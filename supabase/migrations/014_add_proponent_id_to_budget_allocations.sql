-- ============================================================================
-- ADD PROPONENT_ID TO BUDGET ALLOCATIONS
-- ============================================================================
-- Add proponent_id column to budget_allocations table to directly link
-- budget allocations to proponents (similar to LASA rows)

ALTER TABLE procurements.budget_allocations
ADD COLUMN IF NOT EXISTS proponent_id BIGINT REFERENCES procurements.users(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_budget_allocations_proponent_id ON procurements.budget_allocations(proponent_id);

-- ============================================================================
-- TRIGGER: Create notification when proponent is assigned to budget allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.notify_budget_allocation_proponent_assigned()
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
            p_type := 'budget_allocation_assigned',
            p_title := 'Assigned as Proponent',
            p_message := format('You have been assigned as proponent for budget allocation: %s', NEW.allocation_name),
            p_entity_type := 'budget_allocation',
            p_entity_id := NEW.id,
            p_metadata := jsonb_build_object(
                'allocation_name', NEW.allocation_name,
                'fiscal_year', NEW.fiscal_year,
                'fund_source', NEW.fund_source,
                'allocation_amount', NEW.allocation_amount
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_allocation_proponent_assigned_notification
    AFTER INSERT OR UPDATE OF proponent_id ON procurements.budget_allocations
    FOR EACH ROW
    WHEN (NEW.proponent_id IS NOT NULL)
    EXECUTE FUNCTION procurements.notify_budget_allocation_proponent_assigned();

-- ============================================================================
-- TRIGGER: Delete notification when proponent is removed from budget allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION procurements.notify_budget_allocation_proponent_removed()
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
          AND type = 'budget_allocation_assigned'
          AND entity_type = 'budget_allocation'
          AND entity_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_allocation_proponent_removed_notification
    AFTER UPDATE OF proponent_id ON procurements.budget_allocations
    FOR EACH ROW
    WHEN (OLD.proponent_id IS NOT NULL AND (NEW.proponent_id IS NULL OR NEW.proponent_id != OLD.proponent_id))
    EXECUTE FUNCTION procurements.notify_budget_allocation_proponent_removed();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN procurements.budget_allocations.proponent_id IS 'User assigned as proponent for this budget allocation';
