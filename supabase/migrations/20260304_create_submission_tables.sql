-- ============================================
-- Project Submission Enhancement Tables
-- ============================================

-- Task 1.3.1: Add submission_version field to project_submissions table
-- First check if project_submissions table exists and add the field
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS submission_version INTEGER DEFAULT 1;

-- Task 1.3.2: Create submission_versions table for version history
CREATE TABLE IF NOT EXISTS submission_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    github_url TEXT,
    demo_video_url TEXT,
    pitch_deck_url TEXT,
    additional_links JSONB DEFAULT '[]',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_final BOOLEAN DEFAULT false,
    UNIQUE(registration_id, version)
);

-- Task 1.3.3: Add submission_deadline field to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMP WITH TIME ZONE;

-- Add indexes for submission versions
CREATE INDEX idx_submission_versions_registration ON submission_versions(registration_id);
CREATE INDEX idx_submission_versions_version ON submission_versions(registration_id, version);

-- Enable RLS
ALTER TABLE submission_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submission_versions
CREATE POLICY "Users can view their own submission versions"
    ON submission_versions FOR SELECT
    USING (
        registration_id IN (
            SELECT id FROM registrations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create submission versions"
    ON submission_versions FOR INSERT
    WITH CHECK (
        registration_id IN (
            SELECT id FROM registrations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own submission versions"
    ON submission_versions FOR UPDATE
    USING (
        registration_id IN (
            SELECT id FROM registrations WHERE user_id = auth.uid()
        )
    );

-- Organizers can view all submissions for their events
CREATE POLICY "Organizers can view all submission versions for their events"
    ON submission_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM registrations r
            JOIN events e ON e.id = r.event_id
            WHERE r.id = submission_versions.registration_id
            AND e.organizer_id = auth.uid()
        )
    );
