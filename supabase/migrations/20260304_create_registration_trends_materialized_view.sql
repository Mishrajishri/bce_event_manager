-- Migration: Registration Trends Materialized View
-- Created: 2026-03-04
-- Description: Creates a materialized view for registration trends analytics

-- Step 1: Create materialized view for registration trends
CREATE MATERIALIZED VIEW IF NOT EXISTS registration_trends AS
SELECT 
    DATE(registered_at) as date,
    event_id,
    COUNT(*) as registration_count,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
    SUM(COALESCE(payment_amount, 0)) as total_revenue
FROM registrations
WHERE registered_at IS NOT NULL
GROUP BY DATE(registered_at), event_id
WITH DATA;

-- Step 2: Create unique index for concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_trends_unique 
ON registration_trends (date, event_id);

-- Step 3: Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_registration_trends_date 
ON registration_trends (date DESC);

-- Step 4: Create index for event-based queries
CREATE INDEX IF NOT EXISTS idx_registration_trends_event 
ON registration_trends (event_id);

-- Step 5: Create function to refresh the materialized view
-- This can be called manually or via cron job
CREATE OR REPLACE FUNCTION refresh_registration_trends()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY registration_trends;
END;
$$;

-- Step 6: Create function to get trends for a specific event
CREATE OR REPLACE FUNCTION get_event_registration_trends(event_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    registration_count BIGINT,
    confirmed_count BIGINT,
    pending_count BIGINT,
    cancelled_count BIGINT,
    total_revenue DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.date,
        rt.registration_count,
        rt.confirmed_count,
        rt.pending_count,
        rt.cancelled_count,
        rt.total_revenue
    FROM registration_trends rt
    WHERE rt.event_id = event_uuid
    AND rt.date >= CURRENT_DATE - (days || ' days')::INTERVAL
    ORDER BY rt.date DESC;
END;
$$;

-- Step 7: Create function to get platform-wide trends
CREATE OR REPLACE FUNCTION get_platform_registration_trends(days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    total_registrations BIGINT,
    total_confirmed BIGINT,
    total_pending BIGINT,
    total_revenue DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.date,
        SUM(rt.registration_count) as total_registrations,
        SUM(rt.confirmed_count) as total_confirmed,
        SUM(rt.pending_count) as total_pending,
        SUM(rt.total_revenue) as total_revenue
    FROM registration_trends rt
    WHERE rt.date >= CURRENT_DATE - (days || ' days')::INTERVAL
    GROUP BY rt.date
    ORDER BY rt.date DESC;
END;
$$;

-- Step 8: Add comment for documentation
COMMENT ON MATERIALIZED VIEW registration_trends IS 'Materialized view for tracking registration trends over time';
COMMENT ON FUNCTION refresh_registration_trends() IS 'Refresh the registration_trends materialized view (supports concurrent refresh)';
COMMENT ON FUNCTION get_event_registration_trends(UUID, INTEGER) IS 'Get registration trends for a specific event';
COMMENT ON FUNCTION get_platform_registration_trends(INTEGER) IS 'Get platform-wide registration trends';

-- Initial population (non-concurrent since this is first run)
REFRESH MATERIALIZED VIEW registration_trends;

-- Migration complete
SELECT 'Registration trends materialized view created successfully' as status;
