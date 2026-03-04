-- ============================================
-- Communication Tables for Notifications and Team Chat
-- ============================================

-- Task 1.4.1: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1.4.2: Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    event_reminders BOOLEAN DEFAULT true,
    team_updates BOOLEAN DEFAULT true,
    new_announcements BOOLEAN DEFAULT true,
    judging_updates BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1.4.3: Create team_messages table for team chat
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_announcement BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1.4.4: Create event_announcements table with richer features
CREATE TABLE IF NOT EXISTS event_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    author_id UUID NOT NULL, -- References auth.users
    is_pinned BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Add indexes for notification_preferences
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Add indexes for team_messages
CREATE INDEX idx_team_messages_team ON team_messages(team_id);
CREATE INDEX idx_team_messages_user ON team_messages(user_id);
CREATE INDEX idx_team_messages_created ON team_messages(created_at DESC);

-- Add indexes for event_announcements
CREATE INDEX idx_event_announcements_event ON event_announcements(event_id);
CREATE INDEX idx_event_announcements_published ON event_announcements(event_id, published_at) WHERE is_draft = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their notification preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their notification preferences"
    ON notification_preferences FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for team_messages
CREATE POLICY "Team members can view team messages"
    ON team_messages FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create team messages"
    ON team_messages FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team leaders can update/delete messages"
    ON team_messages FOR UPDATE
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Team leaders can delete any messages"
    ON team_messages FOR DELETE
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

-- RLS Policies for event_announcements
CREATE POLICY "Anyone can view published event announcements"
    ON event_announcements FOR SELECT
    USING (
        is_draft = false 
        AND published_at <= NOW()
        AND event_id IN (
            SELECT id FROM events WHERE status IN ('published', 'ongoing', 'completed')
        )
    );

CREATE POLICY "Organizers can view all announcements for their events"
    ON event_announcements FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can create announcements for their events"
    ON event_announcements FOR INSERT
    WITH CHECK (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can update announcements for their events"
    ON event_announcements FOR UPDATE
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can delete announcements for their events"
    ON event_announcements FOR DELETE
    USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );
