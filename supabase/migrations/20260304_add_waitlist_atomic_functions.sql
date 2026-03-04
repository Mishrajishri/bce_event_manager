-- Migration: Add atomic waitlist functions
-- Created: 2026-03-04
-- Description: Adds database functions for atomic waitlist operations

-- Function to get next waitlist position atomically
CREATE OR REPLACE FUNCTION get_next_waitlist_position(event_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_position INTEGER;
BEGIN
    -- Get the max position and add 1
    SELECT COALESCE(MAX(waitlist_position), 0) + 1
    INTO next_position
    FROM registrations
    WHERE event_id = event_uuid AND status = 'waitlisted';
    
    RETURN next_position;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder waitlist positions atomically
CREATE OR REPLACE FUNCTION reorder_waitlist_positions(event_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Use a single UPDATE with ROW_NUMBER to reorder positions atomically
    UPDATE registrations r
    SET waitlist_position = new_pos.new_position
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY waitlisted_at) AS new_position
        FROM registrations
        WHERE event_id = event_uuid AND status = 'waitlisted'
    ) AS new_pos
    WHERE r.id = new_pos.id;
END;
$$ LANGUAGE plpgsql;

-- Migration complete
SELECT 'Atomic waitlist functions migration completed successfully' as status;
