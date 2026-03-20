-- Judge Panels and Judging System Enhancement
-- Multi-judge panel management, conflict detection, peer review, public voting

-- 1. Judge Panels Table
CREATE TABLE IF NOT EXISTS judge_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 2. Panel Judges (which judges belong to which panels)
CREATE TABLE IF NOT EXISTS panel_judges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES judge_panels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'judge',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(panel_id, user_id)
);

-- 3. Judge Assignments (which panel judges which submissions)
CREATE TABLE IF NOT EXISTS judge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES judge_panels(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(submission_id, judge_id)
);

-- 4. Conflict of Interest Records
CREATE TABLE IF NOT EXISTS judge_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id UUID NOT NULL REFERENCES users(id),
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50),
    description TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Peer Reviews (participants review each other)
CREATE TABLE IF NOT EXISTS peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, reviewer_id)
);

-- 6. Public Votes
CREATE TABLE IF NOT EXISTS public_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id),
    vote_value INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, voter_id)
);

-- 7. Demo Sessions (for live judging)
CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_judge_panels_event ON judge_panels(event_id);
CREATE INDEX IF NOT EXISTS idx_panel_judges_panel ON panel_judges(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_judges_user ON panel_judges(user_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_panel ON judge_assignments(panel_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_submission ON judge_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_conflicts_judge ON judge_conflicts(judge_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_public_votes_submission ON public_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_event ON demo_sessions(event_id);

-- Enable RLS
ALTER TABLE judge_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for judge_panels
CREATE POLICY "Organizers can manage judge panels" ON judge_panels
    FOR ALL USING (
        event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
        OR auth.uid() IN (
            SELECT user_id FROM users WHERE role IN ('super_admin', 'admin')
        )
    );

-- RLS Policies for panel_judges
CREATE POLICY "Panel members can view panel judges" ON panel_judges
    FOR SELECT USING (
        user_id = auth.uid()
        OR panel_id IN (
            SELECT id FROM judge_panels WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for judge_assignments
CREATE POLICY "Judges can view their assignments" ON judge_assignments
    FOR SELECT USING (judge_id = auth.uid());

-- RLS Policies for peer_reviews
CREATE POLICY "Event participants can submit peer reviews" ON peer_reviews
    FOR ALL USING (
        reviewer_id = auth.uid()
    );

-- RLS Policies for public_votes  
CREATE POLICY "Authenticated users can vote" ON public_votes
    FOR ALL USING (voter_id = auth.uid());

-- RLS Policies for demo_sessions
CREATE POLICY "Event participants can view demo sessions" ON demo_sessions
    FOR SELECT USING (
        event_id IN (
            SELECT event_id FROM registrations WHERE user_id = auth.uid()
        )
        OR event_id IN (
            SELECT id FROM events WHERE organizer_id = auth.uid()
        )
    );
