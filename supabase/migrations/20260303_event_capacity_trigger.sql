-- Migration to add trigger for event capacity checking to prevent TOCTOU race condition
-- Fixes CWE-362

CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_cap INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count FROM registrations 
    WHERE event_id = NEW.event_id AND status = 'confirmed';
    
    SELECT max_participants INTO max_cap FROM events WHERE id = NEW.event_id;
    
    IF current_count >= max_cap THEN
        RAISE EXCEPTION 'Event capacity exceeded';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_event_capacity ON registrations;

CREATE TRIGGER enforce_event_capacity
BEFORE INSERT OR UPDATE OF status ON registrations
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION check_event_capacity();
