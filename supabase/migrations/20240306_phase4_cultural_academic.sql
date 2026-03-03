
-- Phase 4: Cultural & Academic Features

-- Cultural Performances
CREATE TABLE IF NOT EXISTS public.cultural_performances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL, -- Can be a user_id or team_id (we'll use a type column if needed, or just UUID)
    participant_type TEXT NOT NULL CHECK (participant_type IN ('individual', 'team')),
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 10,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Requirements (Technical Rider)
CREATE TABLE IF NOT EXISTS public.performance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_id UUID NOT NULL REFERENCES public.cultural_performances(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL, -- 'audio', 'lighting', 'props', 'other'
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic Paper Submissions
CREATE TABLE IF NOT EXISTS public.paper_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    file_url TEXT, -- URL to PDF
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'revision_required', 'accepted', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper Reviews
CREATE TABLE IF NOT EXISTS public.paper_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.paper_submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    comments TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cultural_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view performances" ON public.cultural_performances FOR SELECT USING (true);
CREATE POLICY "Anyone can view requirements" ON public.performance_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can view paper submissions" ON public.paper_submissions FOR SELECT USING (true);
CREATE POLICY "Authors and judges can view reviews" ON public.paper_reviews FOR SELECT 
    USING (auth.uid() = reviewer_id OR auth.uid() IN (SELECT author_id FROM public.paper_submissions WHERE id = submission_id));

-- Organizers can manage everything
CREATE POLICY "Organizers can manage performances" ON public.cultural_performances ALL 
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid()));

CREATE POLICY "Organizers can manage paper submissions" ON public.paper_submissions ALL 
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid()));
