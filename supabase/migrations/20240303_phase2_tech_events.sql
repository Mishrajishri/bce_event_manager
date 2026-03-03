
-- Phase 2: Technical Events (Hackathons & Coding Competitions)
-- This migration adds support for project submissions and a flexible judging system.

-- ============================================
-- 1. Project Submissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    github_url TEXT,
    demo_video_url TEXT,
    pitch_deck_url TEXT,
    tech_stack TEXT[], -- Array of technologies used
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'qualified', 'rejected'
    UNIQUE(event_id, team_id) -- Only one submission per team per event
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_event ON project_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON project_submissions(team_id);

-- ============================================
-- 2. Judging System Tables
-- ============================================

-- Rubrics define the criteria for scoring an event
CREATE TABLE IF NOT EXISTS judging_rubrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    criteria_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_score INTEGER NOT NULL DEFAULT 10,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- For weighted scoring
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rubrics_event ON judging_rubrics(event_id);

-- Scores given by judges
CREATE TABLE IF NOT EXISTS submission_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL, -- References auth.users
    rubric_id UUID NOT NULL REFERENCES judging_rubrics(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    comments TEXT,
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, judge_id, rubric_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_submission ON submission_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON submission_scores(judge_id);

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

-- Submissions RLS
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view submissions (for showcase/leaderboard)
CREATE POLICY "Public submissions are viewable by everyone" 
ON project_submissions FOR SELECT USING (true);

-- Team members can create/update their own submission
-- Note: This assumes team_members table has been setup correctly in Phase 1
CREATE POLICY "Teams can manage their own submissions" 
ON project_submissions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = project_submissions.team_id 
        AND team_members.user_id = auth.uid()
    )
);

-- Judging Rubrics RLS
ALTER TABLE judging_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rubrics are viewable by everyone" 
ON judging_rubrics FOR SELECT USING (true);

CREATE POLICY "Organizers can manage rubrics" 
ON judging_rubrics FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = judging_rubrics.event_id 
        AND (events.organizer_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
);

-- Submission Scores RLS
ALTER TABLE submission_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores are viewable by everyone" 
ON submission_scores FOR SELECT USING (true);

CREATE POLICY "Judges can manage their own scores" 
ON submission_scores FOR ALL 
USING (judge_id = auth.uid());

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Function to calculate total weighted score for a submission
CREATE OR REPLACE FUNCTION calculate_submission_score(sub_id UUID)
RETURNS TABLE (total_score NUMERIC, count_judges BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(ss.score * jr.weight) / COUNT(DISTINCT ss.judge_id) as total_score,
        COUNT(DISTINCT ss.judge_id) as count_judges
    FROM submission_scores ss
    JOIN judging_rubrics jr ON ss.rubric_id = jr.id
    WHERE ss.submission_id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
