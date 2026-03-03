
-- Phase 2 Extension: Team Formation and Mentorship
-- This migration adds support for "Find a Team" requests and a mentorship booking system.

-- ============================================
-- 1. Team Requests (Find a Team)
-- ============================================

CREATE TYPE team_request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE IF NOT EXISTS team_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    status team_request_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id) -- Only one active request per team per user
);

CREATE INDEX IF NOT EXISTS idx_team_req_team ON team_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_req_user ON team_requests(user_id);

-- RLS for team_requests
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON team_requests FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team captains can view requests for their team"
ON team_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = team_requests.team_id 
        AND teams.captain_id = auth.uid()
    )
);

CREATE POLICY "Users can create join requests"
ON team_requests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Captains and users can update status"
ON team_requests FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = team_requests.team_id 
        AND teams.captain_id = auth.uid()
    )
);

-- ============================================
-- 2. Mentorship System
-- ============================================

CREATE TABLE IF NOT EXISTS mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expertise_areas TEXT[], -- Array of expertise tags
    bio TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentorship_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    meeting_link TEXT,
    UNIQUE(mentor_id, start_time)
);

CREATE TABLE IF NOT EXISTS mentorship_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES mentorship_slots(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    notes TEXT,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id)
);

-- RLS for mentors
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view mentors" ON mentors FOR SELECT USING (true);
CREATE POLICY "Admin/Organizer can manage mentors" ON mentors FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events WHERE events.id = mentors.event_id 
        AND (events.organizer_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
);

-- RLS for slots
ALTER TABLE mentorship_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view slots" ON mentorship_slots FOR SELECT USING (true);

-- RLS for bookings
ALTER TABLE mentorship_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams can view their own bookings" ON mentorship_bookings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = mentorship_bookings.team_id 
        AND (teams.captain_id = auth.uid() OR 
             EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()))
    )
);
