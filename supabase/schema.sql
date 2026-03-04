-- BCE Event Manager Database Schema for Supabase
-- Run this SQL in the Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'captain', 'attendee');
CREATE TYPE event_type AS ENUM ('sports', 'tech_fest', 'seminar', 'hackathon', 'coding_competition', 'other');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');
CREATE TYPE team_status AS ENUM ('registered', 'confirmed', 'eliminated', 'winner');
CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE sponsor_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE volunteer_status AS ENUM ('assigned', 'on_duty', 'completed');

-- ============================================
-- TABLES
-- ============================================

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL,
    organizer_id UUID NOT NULL, -- References auth.users
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    max_participants INTEGER NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_fee DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    status event_status DEFAULT 'draft',
    cover_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_registration_fee_non_negative CHECK (registration_fee >= 0),
    CONSTRAINT check_valid_currency CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP'))
);

-- Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    captain_id UUID, -- References auth.users
    status team_status DEFAULT 'registered',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members Table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users
    role VARCHAR(50) NOT NULL,
    jersey_number INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Matches Table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team1_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team2_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    score_team1 INTEGER DEFAULT 0,
    score_team2 INTEGER DEFAULT 0,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255),
    status match_status DEFAULT 'scheduled',
    winner_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registrations Table
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status registration_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'unpaid',
    payment_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    receipt TEXT,
    created_by_id UUID, -- References auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsors Table
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo TEXT,
    website_url TEXT,
    tier sponsor_tier,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority priority DEFAULT 'low',
    created_by_id UUID, -- References auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts Table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    required_volunteers INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Volunteers Table
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    role VARCHAR(100) NOT NULL,
    status volunteer_status DEFAULT 'assigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Event Type Configs Table (for flexible JSON configuration)
CREATE TABLE event_type_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, config_type)
);

-- Team Skills Table - Skills tags that can be associated with teams
CREATE TABLE team_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, skill_name)
);

-- Team Requirements Table - Skills that a team is looking for
CREATE TABLE team_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    required_count INTEGER DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'medium',
    is_filled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Skills Table - Skills that users have (participant profiles)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    years_experience INTEGER,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_name)
);

-- Team Invites Table - Invite-based team joining
CREATE TABLE team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL, -- References auth.users
    invitee_email VARCHAR(255),
    invitee_id UUID, -- References auth.users
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_dates ON events(start_date, end_date);

CREATE INDEX idx_teams_event ON teams(event_id);
CREATE INDEX idx_teams_captain ON teams(captain_id);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_teams ON matches(team1_id, team2_id);

CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);

CREATE INDEX idx_expenses_event ON expenses(event_id);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_sponsors_event ON sponsors(event_id);
CREATE INDEX idx_sponsors_tier ON sponsors(tier);

CREATE INDEX idx_announcements_event ON announcements(event_id);

CREATE INDEX idx_shifts_event ON shifts(event_id);

CREATE INDEX idx_volunteers_event ON volunteers(event_id);
CREATE INDEX idx_volunteers_user ON volunteers(user_id);

CREATE INDEX idx_event_type_configs_event ON event_type_configs(event_id);
CREATE INDEX idx_event_type_configs_type ON event_type_configs(config_type);

CREATE INDEX idx_team_skills_team ON team_skills(team_id);
CREATE INDEX idx_team_skills_category ON team_skills(skill_category);

CREATE INDEX idx_team_requirements_team ON team_requirements(team_id);
CREATE INDEX idx_team_requirements_unfilled ON team_requirements(is_filled) WHERE is_filled = false;

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_category ON user_skills(skill_category);
CREATE INDEX idx_user_skills_proficiency ON user_skills(proficiency_level);

CREATE INDEX idx_team_invites_team ON team_invites(team_id);
CREATE INDEX idx_team_invites_status ON team_invites(status);
CREATE INDEX idx_team_invites_email ON team_invites(invitee_email);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Public events are viewable by everyone"
    ON events FOR SELECT
    USING (status IN ('published', 'ongoing', 'completed'));

CREATE POLICY "Organizers can insert events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events"
    ON events FOR UPDATE
    USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events"
    ON events FOR DELETE
    USING (auth.uid() = organizer_id);

-- Teams policies
CREATE POLICY "Anyone can view teams"
    ON teams FOR SELECT
    USING (true);

-- Only authenticated users can create teams for their events
CREATE POLICY "Authenticated users can create teams for events they organize"
    ON teams FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = teams.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Captains and organizers can update teams"
    ON teams FOR UPDATE
    USING (
        auth.uid() = captain_id OR
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN teams t ON t.event_id = e.id
            WHERE t.id = teams.id
        )
    );

-- Team members policies
CREATE POLICY "Anyone can view team members"
    ON team_members FOR SELECT
    USING (true);

CREATE POLICY "Captains and organizers can manage team members"
    ON team_members FOR ALL
    USING (
        auth.uid() IN (
            SELECT captain_id FROM teams WHERE id = team_members.team_id
        ) OR
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN teams t ON t.event_id = e.id
            WHERE t.id = team_members.team_id
        )
    );

-- Matches policies
CREATE POLICY "Anyone can view matches"
    ON matches FOR SELECT
    USING (true);

CREATE POLICY "Organizers can manage matches"
    ON matches FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN matches m ON m.event_id = e.id
            WHERE m.id = matches.id
        )
    );

-- Registrations policies
CREATE POLICY "Users can view their own registrations"
    ON registrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create registrations"
    ON registrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
    ON registrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view registrations for their events"
    ON registrations FOR SELECT
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN registrations r ON r.event_id = e.id
            WHERE r.id = registrations.id
        )
    );

CREATE POLICY "Organizers can update registrations for their events"
    ON registrations FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN registrations r ON r.event_id = e.id
            WHERE r.id = registrations.id
        )
    );

CREATE POLICY "Users can delete their own registrations"
    ON registrations FOR DELETE
    USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Organizers can view expenses for their events"
    ON expenses FOR SELECT
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN expenses ex ON ex.event_id = e.id
            WHERE ex.id = expenses.id
        )
    );

CREATE POLICY "Organizers can manage expenses for their events"
    ON expenses FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN expenses ex ON ex.event_id = e.id
            WHERE ex.id = expenses.id
        )
    );

-- Announcements policies
CREATE POLICY "Anyone can view announcements"
    ON announcements FOR SELECT
    USING (true);

CREATE POLICY "Organizers can manage announcements"
    ON announcements FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN announcements a ON a.event_id = e.id
            WHERE a.id = announcements.id
        )
    );

-- Shifts policies
CREATE POLICY "Anyone can view shifts"
    ON shifts FOR SELECT
    USING (true);

CREATE POLICY "Organizers can manage shifts"
    ON shifts FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN shifts s ON s.event_id = e.id
            WHERE s.id = shifts.id
        )
    );

-- Volunteers policies
CREATE POLICY "Anyone can view volunteers"
    ON volunteers FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own volunteer records"
    ON volunteers FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view volunteers for their events"
    ON volunteers FOR SELECT
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN volunteers v ON v.event_id = e.id
            WHERE v.id = volunteers.id
        )
    );

-- Sponsors policies
CREATE POLICY "Anyone can view sponsors"
    ON sponsors FOR SELECT
    USING (true);

CREATE POLICY "Organizers can manage sponsors"
    ON sponsors FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events e
            JOIN sponsors s ON s.event_id = e.id
            WHERE s.id = sponsors.id
        )
    );

-- Event Type Configs policies
CREATE POLICY "Anyone can view event type configs for published events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.status IN ('published', 'ongoing', 'completed')
        )
    );

CREATE POLICY "Organizers can view configs for their events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage configs for their events"
    ON event_type_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Team Skills policies
CREATE POLICY "Team members can view team skills"
    ON team_skills FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team leaders can manage team skills"
    ON team_skills FOR ALL
    USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

-- Team Requirements policies
CREATE POLICY "Anyone can view team requirements for published events"
    ON team_requirements FOR SELECT
    USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN events e ON e.id = t.event_id
            WHERE e.status IN ('published', 'ongoing', 'completed')
            AND (t.is_public = true OR t.id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Team leaders can manage requirements"
    ON team_requirements FOR ALL
    USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

-- User Skills policies
CREATE POLICY "Users can view their own skills"
    ON user_skills FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own skills"
    ON user_skills FOR ALL
    USING (user_id = auth.uid());

-- Team Invites policies
CREATE POLICY "Invitees and team members can view invites"
    ON team_invites FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
        OR invitee_id = auth.uid()
    );

CREATE POLICY "Team leaders can create invites"
    ON team_invites FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

CREATE POLICY "Invitees can respond to invites"
    ON team_invites FOR UPDATE
    USING (
        invitee_id = auth.uid()
    );

CREATE POLICY "Team leaders can manage invites"
    ON team_invites FOR ALL
    USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on events
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Insert sample event types (for reference)
-- INSERT INTO pg_enum (enumlabel, enumtypid) VALUES 
--   ('sports', (SELECT oid FROM pg_type WHERE typname = 'event_type')),
--   ('tech_fest', (SELECT oid FROM pg_type WHERE typname = 'event_type')),
--   ('seminar', (SELECT oid FROM pg_type WHERE typname = 'event_type')),
--   ('other', (SELECT oid FROM pg_type WHERE typname = 'event_type'))
-- ON CONFLICT DO NOTHING;
