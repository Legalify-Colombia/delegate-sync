-- Create models table
CREATE TABLE public.models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Create policies for models table
CREATE POLICY "Allow admins to manage all models" 
ON public.models 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Allow secretary general to view their model" 
ON public.models 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'secretary_general' 
    AND profiles.model_id = models.id
  )
);

CREATE POLICY "Allow secretary general to update their model" 
ON public.models 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'secretary_general' 
    AND profiles.model_id = models.id
  )
);

-- Add model_id column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);

-- Add model_id column to committees if it doesn't exist  
ALTER TABLE public.committees ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);

-- Add model_id to other tables that need it
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.agenda_participations ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.amonestaciones ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.asistencia ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.attendance_registry ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.debate_log ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.delegate_notes ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.delegate_suspensions ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.detailed_ratings ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.news_publications ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.secretary_speaking ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.speaking_queue ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.staff_requests ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.voting_rounds ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);
ALTER TABLE public.voting_sessions ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.models(id);

-- Update committees policies to allow secretary general to manage their model's committees
CREATE POLICY "Secretary general can manage their model committees" 
ON public.committees 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'secretary_general' 
    AND profiles.model_id = committees.model_id
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'secretary_general' 
    AND profiles.model_id = committees.model_id
  )
);

-- Insert a sample model for testing
INSERT INTO public.models (name, description, location, logo_url) 
VALUES ('LEGALUN 2024', 'Modelo de Naciones Unidas Legalify', 'Universidad Nacional, Bogotá', null);