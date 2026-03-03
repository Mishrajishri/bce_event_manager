
-- Phase 3: Sports & Real-Time Features

-- 1. Match Commentary Table
CREATE TABLE IF NOT EXISTS public.match_commentary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- 'goal', 'foul', 'substitution', 'period_end', etc.
    team_id UUID REFERENCES public.teams(id), -- Optional: if event relates to a team
    player_id UUID, -- Optional: if event relates to a player (will link to a profiles table if needed)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Score History (for audit/replays)
CREATE TABLE IF NOT EXISTS public.score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    score_team1 INTEGER NOT NULL,
    score_team2 INTEGER NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.match_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read commentary and score history
CREATE POLICY "Anyone can view match commentary" ON public.match_commentary
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view score history" ON public.score_history
    FOR SELECT USING (true);

-- Only organizers or super_admins can insert/delete
CREATE POLICY "Organizers can manage commentary" ON public.match_commentary
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.matches m ON m.event_id = e.id
            WHERE m.id = match_commentary.match_id
            AND (e.organizer_id = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
        )
    );

CREATE POLICY "Organizers can manage score history" ON public.score_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.matches m ON m.event_id = e.id
            WHERE m.id = score_history.match_id
            AND (e.organizer_id = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
        )
    );
