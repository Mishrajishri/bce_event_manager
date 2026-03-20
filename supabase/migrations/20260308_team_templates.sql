-- Team Templates for role-based team formation
-- Predefined role structures for hackathon teams

CREATE TABLE IF NOT EXISTS team_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_team_size INTEGER DEFAULT 1,
    max_team_size INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Roles (roles within a template)
CREATE TABLE IF NOT EXISTS template_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES team_templates(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    required_count INTEGER DEFAULT 1,
    skills_needed TEXT[], -- Array of skill names
    display_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_templates_event ON team_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_template_roles_template ON template_roles(template_id);

-- Enable RLS
ALTER TABLE team_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_templates
CREATE POLICY "Anyone can view public templates" ON team_templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Organizers can manage templates" ON team_templates
    FOR ALL USING (
        event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
        OR created_by = auth.uid()
    );

-- RLS Policies for template_roles
CREATE POLICY "Anyone can view template roles" ON template_roles
    FOR SELECT USING (
        template_id IN (SELECT id FROM team_templates WHERE is_public = true)
    );

CREATE POLICY "Template owners can manage roles" ON template_roles
    FOR ALL USING (
        template_id IN (
            SELECT id FROM team_templates WHERE created_by = auth.uid()
        )
    );

-- Default Hackathon Team Templates (will be inserted separately)
