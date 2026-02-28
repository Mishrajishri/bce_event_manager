-- BCE Event Manager — Phase 2 Migration
-- Run this in the Supabase SQL Editor

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    changes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- Feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)  -- one feedback per user per event
);

CREATE INDEX IF NOT EXISTS idx_feedback_event ON feedback(event_id);

-- ============================================================
-- Registrations — add check-in and QR fields
-- ============================================================
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS
    checked_in_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS
    qr_code TEXT DEFAULT NULL;

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Audit logs: only super admins via service role
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Feedback: anyone can read, authenticated users can insert their own
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_read_all" ON feedback
    FOR SELECT USING (true);

CREATE POLICY "feedback_insert_own" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
