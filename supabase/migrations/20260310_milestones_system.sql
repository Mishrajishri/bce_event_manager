-- Phase 6.3: Progress Tracking - Milestones System
-- Creates tables for milestone tracking in hackathons

-- Milestones table: Define milestones for an event
CREATE TABLE IF NOT EXISTS event_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    point_value INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for querying milestones by event
CREATE INDEX idx_event_milestones_event_id ON event_milestones(event_id);
CREATE INDEX idx_event_milestones_due_date ON event_milestones(due_date);

-- Team milestones: Track team progress on each milestone
CREATE TABLE IF NOT EXISTS team_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES event_milestones(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
    submission_link VARCHAR(500),
    submission_notes TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    feedback TEXT,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, milestone_id)
);

-- Add indexes
CREATE INDEX idx_team_milestones_team_id ON team_milestones(team_id);
CREATE INDEX idx_team_milestones_milestone_id ON team_milestones(milestone_id);
CREATE INDEX idx_team_milestones_status ON team_milestones(status);

-- Checkpoint submissions: Submissions linked to milestones
CREATE TABLE IF NOT EXISTS milestone_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_milestone_id UUID NOT NULL REFERENCES team_milestones(id) ON DELETE CASCADE,
    submission_type VARCHAR(50) NOT NULL CHECK (submission_type IN ('github', 'demo_video', 'pitch_deck', 'document', 'other')),
    submission_url VARCHAR(500) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestone_submissions_team_milestone ON milestone_submissions(team_milestone_id);

-- Milestone reminders: Track sent reminders
CREATE TABLE IF NOT EXISTS milestone_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_milestone_id UUID NOT NULL REFERENCES team_milestones(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'custom')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ,
    message TEXT
);

CREATE INDEX idx_milestone_reminders_team_milestone ON milestone_reminders(team_milestone_id);
CREATE INDEX idx_milestone_reminders_scheduled ON milestone_reminders(scheduled_for) WHERE scheduled_for > NOW();

-- RLS Policies
ALTER TABLE event_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_reminders ENABLE ROW LEVEL SECURITY;

-- Event milestones: Organizers and admins can manage
CREATE POLICY "Organizers can manage event milestones" ON event_milestones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN user_roles ur ON ur.event_id = e.id
            WHERE e.id = event_milestones.event_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('organizer', 'admin', 'super_admin')
        )
    );

-- Team milestones: Team members can update, organizers can review
CREATE POLICY "Team members can view their milestones" ON team_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_milestones.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update their milestones" ON team_milestones
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_milestones.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Milestone submissions policies
CREATE POLICY "Team members can manage submissions" ON milestone_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_milestones tm
            JOIN team_members tmem ON tmem.team_id = tm.team_id
            WHERE tm.id = milestone_submissions.team_milestone_id
            AND tmem.user_id = auth.uid()
        )
    );

-- Milestone reminders: Auto-managed, read-only for users
CREATE POLICY "Users can view their reminders" ON milestone_reminders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_milestones tm
            JOIN team_members tmem ON tmem.team_id = tm.team_id
            WHERE tm.id = milestone_reminders.team_milestone_id
            AND tmem.user_id = auth.uid()
        )
    );

-- Helper function to create team milestones when a team joins an event with milestones
CREATE OR REPLACE FUNCTION create_team_milestones()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert milestones for the new team
    INSERT INTO team_milestones (team_id, milestone_id, status)
    SELECT NEW.team_id, em.id, 'pending'
    FROM event_milestones em
    WHERE em.event_id = NEW.event_id
    ON CONFLICT (team_id, milestone_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create team milestones when a team is created for an event
DROP TRIGGER IF EXISTS trigger_create_team_milestones ON teams;
CREATE TRIGGER trigger_create_team_milestones
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION create_team_milestones();

-- Function to get milestone progress for a team
CREATE OR REPLACE FUNCTION get_team_milestone_progress(team_id UUID)
RETURNS TABLE (
    milestone_id UUID,
    name VARCHAR(255),
    due_date TIMESTAMPTZ,
    status VARCHAR(50),
    points_earned INTEGER,
    total_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        em.id,
        em.name,
        em.due_date,
        tm.status,
        COALESCE(tm.points_earned, 0),
        em.point_value
    FROM event_milestones em
    LEFT JOIN team_milestones tm ON tm.milestone_id = em.id AND tm.team_id = team_id
    WHERE em.event_id = (SELECT event_id FROM teams WHERE id = team_id)
    ORDER BY em.sequence_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
