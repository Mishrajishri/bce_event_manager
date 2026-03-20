-- Add volunteer tracking columns for check-in and hour tracking
-- Run this SQL in the Supabase SQL Editor

-- Add checked_in_at column to volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Add hours_worked column to volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(5, 2) DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_shift ON volunteers(shift_id);
