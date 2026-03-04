-- ============================================
-- Analytics Tables for Platform Insights
-- ============================================

-- Task 1.5.1: Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1.5.2: Create event_metrics table for aggregate analytics
CREATE TABLE IF NOT EXISTS event_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    registrations_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    submissions_count INTEGER DEFAULT 0,
    team_count INTEGER DEFAULT 0,
    check_ins_count INTEGER DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, date)
);

-- Task 1.5.3: Create materialized view for registration trends
-- Note: Materialized views need to be refreshed manually or via scheduled job
CREATE MATERIALIZED VIEW IF NOT EXISTS registration_trends AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.event_type,
    DATE_TRUNC('day', r.registered_at) as date,
    COUNT(*) as registration_count,
    COUNT(DISTINCT r.user_id) as unique_registrations
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
GROUP BY e.id, e.name, e.event_type, DATE_TRUNC('day', r.registered_at)
ORDER BY date DESC;

-- Add unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_trends_event_date 
ON registration_trends(event_id, date);

-- Add indexes for user_activity_log
CREATE INDEX idx_user_activity_log_user ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_log_created ON user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_log_resource ON user_activity_log(resource_type, resource_id);

-- Add indexes for event_metrics
CREATE INDEX idx_event_metrics_event ON event_metrics(event_id);
CREATE INDEX idx_event_metrics_date ON event_metrics(date);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;

-- Note: Materialized views don't support RLS in the same way, but we can create a view instead

-- RLS Policies for user_activity_log
CREATE POLICY "Users can view their own activity log"
    ON user_activity_log FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity logs"
    ON user_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "System can insert activity logs"
    ON user_activity_log FOR INSERT
    WITH CHECK (true);

-- RLS Policies for event_metrics
CREATE POLICY "Anyone can view published event metrics"
    ON event_metrics FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE status IN ('published', 'ongoing', 'completed')
        )
    );

CREATE POLICY "Organizers can view metrics for their events"
    ON event_metrics FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "System can insert event metrics"
    ON event_metrics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Organizers can update metrics for their events"
    ON event_metrics FOR UPDATE
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

-- Function to refresh registration trends materialized view
CREATE OR REPLACE FUNCTION refresh_registration_trends()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY registration_trends;
END;
$$;
