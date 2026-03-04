-- Migration: Create event_type_configs table for flexible JSON configuration
-- Created: 2026-03-04

-- Create event_type_configs table
CREATE TABLE IF NOT EXISTS event_type_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, config_type)
);

-- Create index for faster lookups
CREATE INDEX idx_event_type_configs_event ON event_type_configs(event_id);
CREATE INDEX idx_event_type_configs_type ON event_type_configs(config_type);

-- Enable RLS
ALTER TABLE event_type_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view event type configs for published events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.status IN ('published', 'ongoing', 'completed')
        )
    );

CREATE POLICY "Organizers can view configs for their events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can manage configs for their events"
    ON event_type_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Enable RLS
ALTER TABLE event_type_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view configs for published events
CREATE POLICY "Anyone can view event type configs for published events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.status IN ('published', 'ongoing', 'completed')
        )
    );

-- Organizers can view configs for their events
CREATE POLICY "Organizers can view configs for their events"
    ON event_type_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Organizers can manage configs for their events
CREATE POLICY "Organizers can manage configs for their events"
    ON event_type_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_type_configs.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_type_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_event_type_configs_updated_at
    BEFORE UPDATE ON event_type_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_event_type_configs_updated_at();