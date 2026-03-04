-- ============================================
-- Team Skills Tables for Hackathon Team Formation
-- ============================================

-- Add is_public column to teams table for hackathon team visibility
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Task 1.2.1: team_skills table - Skills tags that can be associated with teams
CREATE TABLE IF NOT EXISTS team_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, skill_name)
);

-- Task 1.2.2: team_requirements table - Skills that a team is looking for
CREATE TABLE IF NOT EXISTS team_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    required_count INTEGER DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'medium',
    is_filled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1.2.3: user_skills table - Skills that users have (participant profiles)
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    years_experience INTEGER,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_name)
);

-- Task 1.2.4: team_invites table - Invite-based team joining
CREATE TABLE IF NOT EXISTS team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255),
    invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Task 1.2.5: Add indexes for team_skills and user_skills queries
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
CREATE INDEX idx_team_invites_expiry ON team_invites(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE team_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_skills
CREATE POLICY "Team members can view team skills"
    ON team_skills FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can manage team skills"
    ON team_skills FOR ALL
    USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );

-- RLS Policies for team_requirements
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

-- RLS Policies for user_skills
CREATE POLICY "Users can view their own skills"
    ON user_skills FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own skills"
    ON user_skills FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for team_invites
CREATE POLICY "Invitees and team members can view invites"
    ON team_invites FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
        OR invitee_id = auth.uid()
        OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
        OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Team leaders can manage invites"
    ON team_invites FOR ALL
    USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'leader'
        )
    );
