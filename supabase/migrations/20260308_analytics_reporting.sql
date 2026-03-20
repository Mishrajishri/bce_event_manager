-- Phase 8: Analytics & Reporting
-- Adds cohort analysis, revenue forecasting, custom reports, and scheduled reports

-- ============================================
-- 8.1 Advanced Analytics
-- ============================================

-- Create user cohorts table for cohort analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_name VARCHAR(100) NOT NULL,
    cohort_type VARCHAR(50) NOT NULL, -- 'registration_date', 'event_type', 'college', 'year'
    cohort_date DATE,
    cohort_period VARCHAR(20), -- '2024-01', 'Q1-2024', etc.
    criteria JSONB DEFAULT '{}',
    user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cohort analytics table
CREATE TABLE IF NOT EXISTS cohort_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID NOT NULL REFERENCES user_cohorts(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'registrations', 'revenue', 'engagement', 'retention'
    metric_value DECIMAL(10,2) DEFAULT 0,
    period VARCHAR(20), -- 'week_1', 'month_1', 'month_2', etc.
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create revenue forecasts table
CREATE TABLE IF NOT EXISTS revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_revenue DECIMAL(10,2) NOT NULL,
    confidence_level DECIMAL(5,2), -- 0-100
    model_type VARCHAR(50) DEFAULT 'linear_regression',
    parameters JSONB DEFAULT '{}',
    actual_revenue DECIMAL(10,2),
    variance DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversion funnels table
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    funnel_name VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL, -- [{"name": "page_view", "count": 1000}, {"name": "registration_start", "count": 500}, ...]
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8.2 Custom Reports
-- ============================================

-- Create custom report templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'summary', 'detailed', 'financial', 'engagement'
    parameters JSONB DEFAULT '{}', -- filters, date_range, group_by, etc.
    columns JSONB DEFAULT '[{"key": "name", "label": "Name"}]',
    created_by UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved reports
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Create scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    schedule_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    schedule_time TIME NOT NULL,
    schedule_day INTEGER, -- for monthly (1-28) or weekly (1-7)
    recipients JSONB DEFAULT '[]', -- list of email addresses
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

-- User cohorts RLS
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage cohorts" ON user_cohorts FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Cohort analytics RLS
ALTER TABLE cohort_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage cohort analytics" ON cohort_analytics FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Revenue forecasts RLS
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer can view own event forecasts" ON revenue_forecasts FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Organizer can manage own event forecasts" ON revenue_forecasts FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'admin'
);

-- Conversion funnels RLS
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer can view own funnels" ON conversion_funnels FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Organizer can manage own funnels" ON conversion_funnels FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'admin'
);

-- Report templates RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public templates" ON report_templates FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own templates" ON report_templates FOR SELECT USING (
    created_by = auth.uid() OR is_public = true
);

CREATE POLICY "Users can create templates" ON report_templates FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

CREATE POLICY "Users can update own templates" ON report_templates FOR UPDATE USING (
    created_by = auth.uid()
);

CREATE POLICY "Users can delete own templates" ON report_templates FOR DELETE USING (
    created_by = auth.uid()
);

-- Saved reports RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved reports" ON saved_reports FOR ALL USING (
    created_by = auth.uid()
);

-- Scheduled reports RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scheduled reports" ON scheduled_reports FOR ALL USING (
    created_by = auth.uid()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_cohorts_type ON user_cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_date ON user_cohorts(cohort_date);
CREATE INDEX IF NOT EXISTS idx_cohort_analytics_cohort_id ON cohort_analytics(cohort_id);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_event_id ON revenue_forecasts(event_id);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_date ON revenue_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_event_id ON conversion_funnels(event_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active) WHERE is_active = true;

-- ============================================
-- View: Demographics
-- ============================================

CREATE OR REPLACE VIEW event_demographics AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.event_type,
    u.branch,
    u.year,
    u.college_name,
    COUNT(DISTINCT r.user_id) as participant_count,
    COUNT(DISTINCT r.user_id) FILTER (WHERE r.payment_status = 'paid') as paid_count,
    SUM(r.payment_amount) as total_revenue
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN users u ON u.id = r.user_id
GROUP BY e.id, e.name, e.event_type, u.branch, u.year, u.college_name;

-- ============================================
-- Function: Generate cohort
-- ============================================

CREATE OR REPLACE FUNCTION generate_user_cohort(
    p_cohort_name VARCHAR,
    p_cohort_type VARCHAR,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS UUID AS $$
DECLARE
    v_cohort_id UUID;
    v_user_count INTEGER;
BEGIN
    -- Create cohort
    INSERT INTO user_cohorts (cohort_name, cohort_type, cohort_date, cohort_period, criteria)
    VALUES (
        p_cohort_name,
        p_cohort_type,
        p_start_date,
        TO_CHAR(p_start_date, 'YYYY-MM'),
        jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date)
    )
    RETURNING id INTO v_cohort_id;
    
    -- Count users in cohort
    SELECT COUNT(DISTINCT r.user_id) INTO v_user_count
    FROM registrations r
    WHERE r.registered_at::DATE BETWEEN p_start_date AND p_end_date;
    
    -- Update user count
    UPDATE user_cohorts SET user_count = v_user_count WHERE id = v_cohort_id;
    
    RETURN v_cohort_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Calculate conversion funnel
-- ============================================

CREATE OR REPLACE FUNCTION calculate_conversion_funnel(
    p_event_id UUID,
    p_funnel_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_funnel_id UUID;
    v_page_views INTEGER;
    v_registration_starts INTEGER;
    v_registrations INTEGER;
    v_confirmed INTEGER;
    v_checked_in INTEGER;
BEGIN
    -- Get counts for each stage (simplified example)
    SELECT COUNT(*) INTO v_page_views FROM user_activity_log 
    WHERE resource_id = p_event_id::text AND action = 'page_view';
    
    SELECT COUNT(DISTINCT user_id) INTO v_registration_starts FROM registrations 
    WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_registrations FROM registrations 
    WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_confirmed FROM registrations 
    WHERE event_id = p_event_id AND status = 'confirmed';
    
    SELECT COUNT(*) INTO v_checked_in FROM registrations 
    WHERE event_id = p_event_id AND checked_in_at IS NOT NULL;
    
    -- Create funnel record
    INSERT INTO conversion_funnels (
        event_id,
        funnel_name,
        steps,
        total_conversions,
        conversion_rate
    ) VALUES (
        p_event_id,
        p_funnel_name,
        jsonb_build_array(
            jsonb_build_object('name', 'Page Views', 'count', v_page_views),
            jsonb_build_object('name', 'Started Registration', 'count', v_registration_starts),
            jsonb_build_object('name', 'Registered', 'count', v_registrations),
            jsonb_build_object('name', 'Confirmed', 'count', v_confirmed),
            jsonb_build_object('name', 'Checked In', 'count', v_checked_in)
        ),
        v_checked_in,
        CASE WHEN v_page_views > 0 THEN (v_checked_in::DECIMAL / v_page_views * 100) ELSE 0 END
    )
    RETURNING id INTO v_funnel_id;
    
    RETURN v_funnel_id;
END;
$$ LANGUAGE plpgsql;
