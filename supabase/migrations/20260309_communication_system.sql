-- Phase 9: Communication & Notifications
-- Adds email integration with Resend, browser push notifications support

-- ============================================
-- 9.1 Browser Push Notifications
-- ============================================

-- Create push subscription table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL, -- {p256dh, auth}
    browser VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 9.2 Email Integration
-- ============================================

-- Create email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    event_type VARCHAR(50), -- NULL for global templates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email queue
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_id UUID REFERENCES email_templates(id),
    template_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 0
);

-- Create email send log
CREATE TABLE IF NOT EXISTS email_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(100) UNIQUE, -- Resend message ID
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

-- Push subscriptions RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions FOR ALL USING (user_id = auth.uid());

-- Email templates RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manages email templates" ON email_templates FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
);

-- Email queue RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY "System manages email queue" ON email_queue;
CREATE POLICY "System can manage email queue" ON email_queue FOR ALL USING (true);

-- Email log RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin views email log" ON email_log FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at);

-- ============================================
-- Default Email Templates
-- ============================================

INSERT INTO email_templates (name, subject, body_html, body_text, event_type) VALUES
('welcome', 'Welcome to BCE Event Manager!', 
 '<html><body><h1>Welcome, {{name}}!</h1><p>Thanks for joining BCE Event Manager. Start exploring events and connect with participants!</p></body></html>',
 'Welcome, {{name}}! Thanks for joining BCE Event Manager.',
 NULL),

('registration_confirmation', 'Registration Confirmed - {{event_name}}',
 '<html><body><h1>Registration Confirmed!</h1><p>Hi {{name}}, your registration for <strong>{{event_name}}</strong> is confirmed.</p><p>Event Date: {{event_date}}</p><p>Venue: {{venue}}</p></body></html>',
 'Registration Confirmed! Hi {{name}}, your registration for {{event_name}} is confirmed.',
 'hackathon'),

('event_reminder', 'Reminder: {{event_name}} is coming up!',
 '<html><body><h1>Event Reminder</h1><p>Hi {{name}}, just a reminder that {{event_name}} starts on {{event_date}}.</p><p>Don''t forget to prepare!</p></body></html>',
 'Event Reminder: {{event_name}} starts on {{event_date}}.',
 NULL),

('team_invite', 'You''ve been invited to join a team',
 '<html><body><h1>Team Invitation</h1><p>Hi {{name}}, you''ve been invited to join <strong>{{team_name}}</strong> for {{event_name}}.</p><p>{{message}}</p></body></html>',
 'You''ve been invited to join {{team_name}} for {{event_name}}.',
 'hackathon'),

('mentorship_booking', 'Mentorship Session Confirmed',
 '<html><body><h1>Mentorship Session Confirmed</h1><p>Hi {{name}}, your mentorship session with {{mentor_name}} is confirmed.</p><p>Date: {{session_date}}</p><p>Link: {{meeting_link}}</p></body></html>',
 'Mentorship Session Confirmed for {{session_date}}.',
 'hackathon'),

('submission_reminder', 'Submission Deadline Approaching - {{event_name}}',
 '<html><body><h1>Submission Reminder</h1><p>Hi {{name}}, don''t forget to submit your project for {{event_name}}!</p><p>Deadline: {{deadline}}</p></body></html>',
 'Submission deadline for {{event_name}} is {{deadline}}.',
 'hackathon');

-- ============================================
-- Helper Functions
-- ============================================

-- Add email to queue
CREATE OR REPLACE FUNCTION queue_email(
    p_to_email VARCHAR,
    p_subject VARCHAR,
    p_template_name VARCHAR DEFAULT NULL,
    p_template_data JSONB DEFAULT '{}',
    p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_priority INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_template_id UUID;
BEGIN
    -- Get template if provided
    IF p_template_name IS NOT NULL THEN
        SELECT id INTO v_template_id FROM email_templates WHERE name = p_template_name;
    END IF;
    
    -- If template found, use it
    IF v_template_id IS NOT NULL THEN
        INSERT INTO email_queue (to_email, subject, template_id, template_data, scheduled_at, priority)
        VALUES (p_to_email, p_subject, v_template_id, p_template_data, p_scheduled_at, p_priority)
        RETURNING id INTO v_queue_id;
    ELSE
        -- Direct email
        INSERT INTO email_queue (to_email, subject, body_html, scheduled_at, priority)
        VALUES (p_to_email, p_subject, p_template_data->>'body_html', p_scheduled_at, p_priority)
        RETURNING id INTO v_queue_id;
    END IF;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Process email queue (for background worker)
CREATE OR REPLACE FUNCTION process_email_queue(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_queue email_queue%ROWTYPE;
    v_template email_templates%ROWTYPE;
BEGIN
    -- Get pending emails
    FOR v_queue IN 
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT p_limit
    LOOP
        -- Update status to processing
        UPDATE email_queue SET status = 'processing', attempts = attempts + 1 WHERE id = v_queue.id;
        
        -- Get template if available
        IF v_queue.template_id IS NOT NULL THEN
            SELECT * INTO v_template FROM email_templates WHERE id = v_queue.template_id;
            
            IF v_template.id IS NOT NULL THEN
                -- Replace template variables (simple replacement)
                UPDATE email_queue SET
                    subject = REPLACE(v_template.subject, '{{name}}', COALESCE(v_queue.template_data->>'name', v_queue.to_name, 'User')),
                    body_html = REPLACE(v_template.body_html, '{{name}}', COALESCE(v_queue.template_data->>'name', v_queue.to_name, 'User'))
                WHERE id = v_queue.id;
            END IF;
        END IF;
        
        -- Mark as sent (actual sending would be done by external service)
        UPDATE email_queue SET 
            status = 'sent', 
            sent_at = NOW() 
        WHERE id = v_queue.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
