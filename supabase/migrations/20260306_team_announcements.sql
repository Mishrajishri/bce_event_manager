-- Team Announcements Table
-- Stores announcements made by team captains for their team members

CREATE TABLE IF NOT EXISTS team_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_team_announcements_team_id ON team_announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_announcements_created_at ON team_announcements(created_at DESC);

-- Enable RLS
ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view announcements" ON team_announcements
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
        OR team_id IN (
            SELECT id FROM teams WHERE captain_id = auth.uid()
        )
    );

CREATE POLICY "Team captains can create announcements" ON team_announcements
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE captain_id = auth.uid()
        )
    );

CREATE POLICY "Authors can update their announcements" ON team_announcements
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their announcements" ON team_announcements
    FOR DELETE USING (author_id = auth.uid());

-- Team Members View for better member listing
CREATE OR REPLACE VIEW team_members_with_user AS
SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.jersey_number,
    tm.is_active,
    tm.created_at,
    t.name as team_name,
    t.event_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.enrollment_number,
    u.branch,
    u.college_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN users u ON tm.user_id = u.id;
