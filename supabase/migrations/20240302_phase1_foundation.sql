-- Phase 1 Foundation: Event Types and User Profiles

-- 1. Extend event_type enum
-- Note: Suboptimal to drop and recreate in production, but for development/migration:
ALTER TYPE event_type ADD VALUE 'hackathon';
ALTER TYPE event_type ADD VALUE 'coding_competition';
ALTER TYPE event_type ADD VALUE 'cultural';
ALTER TYPE event_type ADD VALUE 'workshop';
ALTER TYPE event_type ADD VALUE 'paper_presentation';

-- 2. Update events table
ALTER TABLE events ADD COLUMN category VARCHAR(50);

-- 3. Create event_type_configs table
CREATE TABLE event_type_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE event_type_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event type configs are viewable by everyone"
    ON event_type_configs FOR SELECT
    USING (true);

CREATE POLICY "Organizers can manage configs for their events"
    ON event_type_configs FOR ALL
    USING (
        auth.uid() IN (
            SELECT organizer_id FROM events WHERE id = event_type_configs.event_id
        )
    );

-- 4. Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_number VARCHAR(20) UNIQUE,
    branch VARCHAR(50),
    year INTEGER,
    college_name VARCHAR(255),
    is_external BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 5. Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, enrollment_number, branch, year, college_name, is_external)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'enrollment_number',
    NEW.raw_user_meta_data->>'branch',
    (NEW.raw_user_meta_data->>'year')::integer,
    NEW.raw_user_meta_data->>'college_name',
    (NEW.raw_user_meta_data->>'is_external')::boolean
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Index for performance
CREATE INDEX idx_event_type_configs_event ON event_type_configs(event_id);
CREATE INDEX idx_profiles_enrollment ON profiles(enrollment_number);
