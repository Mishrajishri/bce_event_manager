-- Phase 6.4: Prize Management
-- Creates tables for hackathon prize management

-- Prize Categories (1st, 2nd, 3rd, special categories, etc.)
CREATE TABLE IF NOT EXISTS prize_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rank INTEGER NOT NULL DEFAULT 0,  -- 1 for 1st, 2 for 2nd, etc.
    is_special BOOLEAN DEFAULT false,  -- For special prizes like "Best Innovation"
    icon VARCHAR(100),  -- Icon name for display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prize_categories_event ON prize_categories(event_id);
CREATE INDEX idx_prize_categories_rank ON prize_categories(event_id, rank);

-- Prizes (specific prizes for each category)
CREATE TABLE IF NOT EXISTS prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES prize_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prize_type VARCHAR(50) NOT NULL CHECK (prize_type IN ('cash', 'certificate', 'trophy', 'merch', 'service', 'other')),
    value DECIMAL(10, 2),  -- Monetary value or description
    currency VARCHAR(3) DEFAULT 'INR',
    sponsor_id UUID,  -- Optional sponsor
    image_url VARCHAR(500),
    is_winner_selected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prizes_event ON prizes(event_id);
CREATE INDEX idx_prizes_category ON prizes(category_id);

-- Prize Winners
CREATE TABLE IF NOT EXISTS prize_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prize_id UUID NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rank INTEGER NOT NULL,  -- 1, 2, 3 for the category
    announcement_order INTEGER DEFAULT 0,  -- For controlling announcement sequence
    announced_at TIMESTAMPTZ,
    certificate_url VARCHAR(500),
    distribution_status VARCHAR(50) DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'sent', 'claimed', 'failed')),
    distribution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prize_id, team_id),
    UNIQUE(prize_id, user_id)
);

CREATE INDEX idx_prize_winners_prize ON prize_winners(prize_id);
CREATE INDEX idx_prize_winners_team ON prize_winners(team_id);
CREATE INDEX idx_prize_winners_event ON prize_winners(prize_id, event_id) INCLUDE (prize_id);

-- Prize Sponsors
CREATE TABLE IF NOT EXISTS prize_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    tier VARCHAR(50) CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze')),
    contribution_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prize_sponsors_event ON prize_sponsors(event_id);

-- Prize Claims (for digital distribution)
CREATE TABLE IF NOT EXISTS prize_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_id UUID NOT NULL REFERENCES prize_winners(id) ON DELETE CASCADE,
    claim_token VARCHAR(255) UNIQUE NOT NULL,
    claimed_at TIMESTAMPTZ,
    claim_ip VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE prize_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;

-- Prize Categories: Organizers can manage
CREATE POLICY "Organizers can manage prize categories" ON prize_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN user_roles ur ON ur.event_id = e.id
            WHERE e.id = prize_categories.event_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('organizer', 'admin', 'super_admin')
        )
    );

-- Prizes: Public read, organizers write
CREATE POLICY "Anyone can view prizes" ON prizes
    FOR SELECT USING (true);

CREATE POLICY "Organizers can manage prizes" ON prizes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN user_roles ur ON ur.event_id = e.id
            WHERE e.id = prizes.event_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('organizer', 'admin', 'super_admin')
        )
    );

-- Prize Winners: Public read for announced, organizers write
CREATE POLICY "Anyone can view announced winners" ON prize_winners
    FOR SELECT USING (announced_at IS NOT NULL);

CREATE POLICY "Organizers can manage winners" ON prize_winners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prizes p
            JOIN events e ON e.id = p.event_id
            JOIN user_roles ur ON ur.event_id = e.id
            WHERE p.id = prize_winners.prize_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('organizer', 'admin', 'super_admin')
        )
    );

-- Prize Sponsors: Public read, organizers write
CREATE POLICY "Anyone can view sponsors" ON prize_sponsors
    FOR SELECT USING (true);

CREATE POLICY "Organizers can manage sponsors" ON prize_sponsors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events e
            JOIN user_roles ur ON ur.event_id = e.id
            WHERE e.id = prize_sponsors.event_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('organizer', 'admin', 'super_admin')
        )
    );

-- Prize Claims: Winners can claim their prizes
CREATE POLICY "Winners can manage claims" ON prize_claims
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prize_winners pw
            JOIN prizes p ON p.id = pw.prize_id
            WHERE pw.id = prize_claims.winner_id
            AND (pw.user_id = auth.uid() OR pw.team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
            ))
        )
    );

-- View for public leaderboard
CREATE OR REPLACE VIEW event_winners AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    pc.name as category_name,
    pc.rank as category_rank,
    pc.is_special,
    p.name as prize_name,
    p.prize_type,
    p.value,
    t.name as team_name,
    u.first_name || ' ' || u.last_name as winner_name,
    pw.rank as winner_rank,
    pw.announced_at
FROM events e
JOIN prizes p ON p.event_id = e.id
JOIN prize_categories pc ON pc.id = p.category_id
LEFT JOIN prize_winners pw ON pw.prize_id = p.id
LEFT JOIN teams t ON t.id = pw.team_id
LEFT JOIN users u ON u.id = pw.user_id
WHERE pw.announced_at IS NOT NULL
ORDER BY pc.rank, pw.rank;

-- Function to get prize leaderboard
CREATE OR REPLACE FUNCTION get_event_prize_leaderboard(event_id UUID)
RETURNS TABLE (
    category_name VARCHAR(255),
    rank INTEGER,
    prize_name VARCHAR(255),
    prize_type VARCHAR(50),
    value DECIMAL(10,2),
    winner_team_name VARCHAR(255),
    winner_user_name VARCHAR(255),
    announced_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.name::VARCHAR(255),
        pw.rank,
        p.name::VARCHAR(255),
        p.prize_type::VARCHAR(50),
        p.value,
        t.name::VARCHAR(255),
        (u.first_name || ' ' || u.last_name)::VARCHAR(255),
        pw.announced_at
    FROM prize_categories pc
    JOIN prizes p ON p.category_id = pc.id AND p.event_id = event_id
    LEFT JOIN prize_winners pw ON pw.prize_id = p.id
    LEFT JOIN teams t ON t.id = pw.team_id
    LEFT JOIN users u ON u.id = pw.user_id
    WHERE pw.announced_at IS NOT NULL
    ORDER BY pc.rank, pw.rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
