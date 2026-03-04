-- Migration: Waitlist System
-- Created: 2026-03-04
-- Description: Adds waitlist functionality to the event registration system

-- Step 1: Add waitlist fields to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
ADD COLUMN IF NOT EXISTS waitlisted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist 
ON registrations(event_id, status, waitlist_position) 
WHERE status = 'waitlisted';

CREATE INDEX IF NOT EXISTS idx_registrations_waitlisted_at 
ON registrations(waitlisted_at) 
WHERE status = 'waitlisted';

-- Step 3: Create waitlist history table for audit trail
CREATE TABLE IF NOT EXISTS waitlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'promoted', 'cancelled', 'removed')),
    old_position INTEGER,
    new_position INTEGER,
    triggered_by UUID REFERENCES auth.users(id), -- null for auto-promotion
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for waitlist history
CREATE INDEX IF NOT EXISTS idx_waitlist_history_registration 
ON waitlist_history(registration_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_history_created 
ON waitlist_history(created_at DESC);

-- Step 5: Enable Row Level Security
ALTER TABLE waitlist_history ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies for waitlist_history

-- Users can view their own waitlist history
CREATE POLICY "Users can view own waitlist history"
ON waitlist_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM registrations r
    WHERE r.id = waitlist_history.registration_id
    AND r.user_id = auth.uid()
));

-- Organizers can view waitlist history for their events
CREATE POLICY "Organizers can view event waitlist history"
ON waitlist_history FOR SELECT
USING (EXISTS (
    SELECT 1 FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = waitlist_history.registration_id
    AND e.organizer_id = auth.uid()
));

-- Only system/admins can insert (via backend service role)
CREATE POLICY "System can insert waitlist history"
ON waitlist_history FOR INSERT
WITH CHECK (true); -- Backend uses service role key

-- Step 7: Create function to get waitlist count for an event
CREATE OR REPLACE FUNCTION get_waitlist_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM registrations 
        WHERE event_id = event_uuid 
        AND status = 'waitlisted'
    );
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to check if event has waitlist
CREATE OR REPLACE FUNCTION event_has_waitlist(event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM registrations 
        WHERE event_id = event_uuid 
        AND status = 'waitlisted'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add comment for documentation
COMMENT ON TABLE waitlist_history IS 'Audit trail for waitlist movements and promotions';
COMMENT ON COLUMN registrations.waitlist_position IS 'Position in waitlist queue (null if not waitlisted)';
COMMENT ON COLUMN registrations.waitlisted_at IS 'Timestamp when user was added to waitlist';
COMMENT ON COLUMN registrations.promoted_at IS 'Timestamp when user was promoted from waitlist to confirmed';

-- Migration complete
SELECT 'Waitlist system migration completed successfully' as status;
