-- Migration: Add registration_fee and currency fields to events table
-- Created: 2026-03-04

-- Add registration_fee column (default 0 for free events)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Add currency column (default INR for Indian Rupees)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';

-- Add check constraint for non-negative fees
ALTER TABLE events 
ADD CONSTRAINT check_registration_fee_non_negative 
CHECK (registration_fee >= 0);

-- Add check constraint for valid currency codes
ALTER TABLE events 
ADD CONSTRAINT check_valid_currency 
CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP'));

-- Update existing events to have default values
UPDATE events 
SET registration_fee = 0.00, 
    currency = 'INR' 
WHERE registration_fee IS NULL 
   OR currency IS NULL;