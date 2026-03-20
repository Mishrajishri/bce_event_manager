-- Phase 7: Mentorship System Enhancements
-- Adds mentor approval workflow, ratings, feedback, and booking modifications

-- ============================================
-- 7.1 Mentor Management Enhancements
-- ============================================

-- Add status field to mentors table for approval workflow
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add avatar_url and average_rating fields
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add rejection reason field
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- 7.2 Booking System Enhancements
-- ============================================

-- Add booking status field
ALTER TABLE mentorship_bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show'));

-- Add meeting link to bookings (for when mentor updates it)
ALTER TABLE mentorship_bookings ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add session notes (mentor feedback for team)
ALTER TABLE mentorship_bookings ADD COLUMN IF NOT EXISTS mentor_notes TEXT;

-- Add created_at and updated_at
ALTER TABLE mentorship_bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE mentorship_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 7.3 Feedback & Rating System
-- ============================================

-- Create session feedback table
CREATE TABLE IF NOT EXISTS mentorship_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES mentorship_bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    would_recommend BOOLEAN DEFAULT true,
    areas_improved TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id)
);

-- Create mentor ratings table (for aggregate stats)
CREATE TABLE IF NOT EXISTS mentor_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES mentorship_bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id, booking_id)
);

-- Create mentor recommendations table (for "would recommend" tracking)
CREATE TABLE IF NOT EXISTS mentor_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    total_recommendations INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    recommendation_rate DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Mentors RLS - allow users to update their own profiles
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved mentors" ON mentors;
CREATE POLICY "Users can view approved mentors" ON mentors FOR SELECT USING (
    status = 'approved' OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Mentors can update own profile" ON mentors;
CREATE POLICY "Mentors can update own profile" ON mentors FOR UPDATE USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admin/Organizer can manage mentor status" ON mentors;
CREATE POLICY "Admin/Organizer can manage mentor status" ON mentors FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = mentors.event_id 
        AND (events.organizer_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
);

-- Mentorship bookings RLS
ALTER TABLE mentorship_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams can view own bookings" ON mentorship_bookings;
CREATE POLICY "Teams can view own bookings" ON mentorship_bookings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = mentorship_bookings.team_id 
        AND (teams.captain_id = auth.uid() OR auth.uid() IN (
            SELECT user_id FROM team_members WHERE team_id = teams.id
        ))
    )
    OR auth.jwt() ->> 'role' = 'admin'
);

DROP POLICY IF EXISTS "Mentors can view bookings for their slots" ON mentorship_bookings;
CREATE POLICY "Mentors can view bookings for their slots" ON mentorship_bookings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM mentorship_slots 
        WHERE mentorship_slots.id = mentorship_bookings.slot_id 
        AND mentorship_slots.mentor_id IN (
            SELECT id FROM mentors WHERE user_id = auth.uid()
        )
    )
);

-- Mentorship feedback RLS
ALTER TABLE mentorship_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams can create feedback for their bookings" ON mentorship_feedback;
CREATE POLICY "Teams can create feedback for their bookings" ON mentorship_feedback FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM mentorship_bookings mb
        JOIN teams t ON t.id = mb.team_id
        WHERE mb.id = mentorship_feedback.booking_id 
        AND t.captain_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Anyone can view feedback" ON mentorship_feedback;
CREATE POLICY "Anyone can view feedback" ON mentorship_feedback FOR SELECT USING (true);

-- Mentor ratings RLS
ALTER TABLE mentor_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view mentor ratings" ON mentor_ratings FOR SELECT USING (true);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentors_event_id ON mentors(event_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_bookings_status ON mentorship_bookings(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_bookings_slot_id ON mentorship_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_feedback_booking_id ON mentorship_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_mentor_ratings_mentor_id ON mentor_ratings(mentor_id);

-- ============================================
-- Update function for mentor stats
-- ============================================

CREATE OR REPLACE FUNCTION update_mentor_stats(p_mentor_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_sessions INTEGER;
    v_avg_rating DECIMAL(3,2);
    v_total_recommendations INTEGER;
    v_total_checked INTEGER;
BEGIN
    -- Count completed sessions
    SELECT COUNT(*) INTO v_total_sessions
    FROM mentorship_bookings
    WHERE slot_id IN (SELECT id FROM mentorship_slots WHERE mentor_id = p_mentor_id)
    AND status = 'completed';
    
    -- Calculate average rating
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM mentor_ratings
    WHERE mentor_id = p_mentor_id;
    
    -- Count recommendations
    SELECT COUNT(*) INTO v_total_recommendations
    FROM mentorship_feedback f
    JOIN mentorship_bookings b ON b.id = f.booking_id
    JOIN mentorship_slots s ON s.id = b.slot_id
    WHERE s.mentor_id = p_mentor_id
    AND f.would_recommend = true;
    
    -- Count total checked sessions
    SELECT COUNT(*) INTO v_total_checked
    FROM mentorship_feedback f
    JOIN mentorship_bookings b ON b.id = f.booking_id
    JOIN mentorship_slots s ON s.id = b.slot_id
    WHERE s.mentor_id = p_mentor_id;
    
    -- Update mentor record
    UPDATE mentors SET
        total_sessions = v_total_sessions,
        average_rating = v_avg_rating,
        updated_at = NOW()
    WHERE id = p_mentor_id;
    
    -- Update or insert recommendations
    INSERT INTO mentor_recommendations (mentor_id, total_recommendations, total_sessions, recommendation_rate, updated_at)
    VALUES (p_mentor_id, v_total_recommendations, v_total_checked, 
        CASE WHEN v_total_checked > 0 THEN (v_total_recommendations::DECIMAL / v_total_checked * 100) ELSE 0 END,
        NOW())
    ON CONFLICT (mentor_id) DO UPDATE SET
        total_recommendations = v_total_recommendations,
        total_sessions = v_total_checked,
        recommendation_rate = CASE WHEN v_total_checked > 0 THEN (v_total_recommendations::DECIMAL / v_total_checked * 100) ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
