-- Create tables for the new functionality

-- Table for delegate notes (private notes only they can see)
CREATE TABLE public.delegate_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delegate_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delegate_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for delegate notes
CREATE POLICY "Delegates can manage their own notes" 
ON public.delegate_notes 
FOR ALL 
USING (auth.uid() = delegate_id);

-- Table for speaking queue/interventions
CREATE TABLE public.speaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'speaking', 'completed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_allocated INTEGER DEFAULT 120 -- seconds
);

-- Enable RLS
ALTER TABLE public.speaking_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for speaking queue
CREATE POLICY "Committee members can view speaking queue" 
ON public.speaking_queue 
FOR SELECT 
USING (committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Delegates can request to speak" 
ON public.speaking_queue 
FOR INSERT 
WITH CHECK (auth.uid() = delegate_id AND committee_id = get_user_committee(auth.uid()) AND get_user_role(auth.uid()) = 'delegate'::app_role);

CREATE POLICY "Committee secretaries can manage queue" 
ON public.speaking_queue 
FOR ALL 
USING ((get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid())) 
       OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

-- Detailed ratings table (replacing the simple ratings table)
CREATE TABLE public.detailed_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secretary_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  committee_id UUID NOT NULL,
  personal_presentation INTEGER NOT NULL CHECK (personal_presentation >= 1 AND personal_presentation <= 10),
  speech_appreciation INTEGER NOT NULL CHECK (speech_appreciation >= 1 AND speech_appreciation <= 10),
  additional_interventions INTEGER NOT NULL CHECK (additional_interventions >= 1 AND additional_interventions <= 10),
  counterproposal_quality INTEGER NOT NULL CHECK (counterproposal_quality >= 1 AND counterproposal_quality <= 10),
  dispositions_quality INTEGER NOT NULL CHECK (dispositions_quality >= 1 AND dispositions_quality <= 10),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(secretary_id, delegate_id, committee_id)
);

-- Enable RLS
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for detailed ratings
CREATE POLICY "Committee secretaries can create detailed ratings" 
ON public.detailed_ratings 
FOR INSERT 
WITH CHECK ((get_user_role(auth.uid()) = 'committee_secretary'::app_role) AND (secretary_id = auth.uid()) AND (committee_id = get_user_committee(auth.uid())));

CREATE POLICY "Users can view relevant detailed ratings" 
ON public.detailed_ratings 
FOR SELECT 
USING ((delegate_id = auth.uid()) OR (secretary_id = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])));

CREATE POLICY "Committee secretaries can update their ratings" 
ON public.detailed_ratings 
FOR UPDATE 
USING ((get_user_role(auth.uid()) = 'committee_secretary'::app_role) AND (secretary_id = auth.uid()));

-- News/Publications table for press
CREATE TABLE public.news_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  committee_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted_for_review', 'approved', 'rejected', 'published_internal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.news_publications ENABLE ROW LEVEL SECURITY;

-- Create policies for news publications
CREATE POLICY "Press can manage their own publications" 
ON public.news_publications 
FOR ALL 
USING ((get_user_role(auth.uid()) = 'press'::app_role AND author_id = auth.uid()) 
       OR (get_user_role(auth.uid()) = 'communications_secretary'::app_role)
       OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])));

CREATE POLICY "All authenticated users can view approved publications" 
ON public.news_publications 
FOR SELECT 
USING (auth.role() = 'authenticated'::text AND status IN ('approved', 'published_internal'));

-- Staff requests table
CREATE TABLE public.staff_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  committee_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for staff requests
CREATE POLICY "Secretaries can create staff requests" 
ON public.staff_requests 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['committee_secretary'::app_role, 'communications_secretary'::app_role, 'secretary_general'::app_role]) 
            AND requester_id = auth.uid());

CREATE POLICY "Staff can view and manage requests" 
ON public.staff_requests 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role]) 
       OR requester_id = auth.uid());

CREATE POLICY "Requesters can view their own requests" 
ON public.staff_requests 
FOR SELECT 
USING (requester_id = auth.uid());

-- Add triggers for updated_at columns
CREATE TRIGGER update_delegate_notes_updated_at
  BEFORE UPDATE ON public.delegate_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_publications_updated_at
  BEFORE UPDATE ON public.news_publications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_requests_updated_at
  BEFORE UPDATE ON public.staff_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER TABLE public.delegate_notes REPLICA IDENTITY FULL;
ALTER TABLE public.speaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.detailed_ratings REPLICA IDENTITY FULL;
ALTER TABLE public.news_publications REPLICA IDENTITY FULL;
ALTER TABLE public.staff_requests REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.delegate_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.detailed_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_publications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_requests;