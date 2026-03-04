-- Migration: Add hackathon and coding_competition to event_type enum
-- Created: 2026-03-04

-- Add 'hackathon' to event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'hackathon';

-- Add 'coding_competition' to event_type enum  
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'coding_competition';

-- Verify the update (optional - for checking)
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'event_type'::regtype ORDER BY enumsortorder;