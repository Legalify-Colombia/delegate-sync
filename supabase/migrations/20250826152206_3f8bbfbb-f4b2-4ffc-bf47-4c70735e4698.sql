-- Create ENUMs
CREATE TYPE app_role AS ENUM ('admin', 'secretary_general', 'committee_secretary', 'communications_secretary', 'delegate', 'staff', 'press');
CREATE TYPE committee_status AS ENUM ('active', 'paused', 'voting');
CREATE TYPE vote_type AS ENUM ('for', 'against', 'abstain');
CREATE TYPE event_type AS ENUM ('timer_start', 'timer_pause', 'vote_started', 'vote_closed');

-- Create countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create committees table
CREATE TABLE public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  current_status committee_status DEFAULT 'paused',
  current_timer_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'delegate',
  committee_id UUID REFERENCES public.committees(id) ON DELETE SET NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, committee_id)
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secretary_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create debate_log table
CREATE TABLE public.debate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create announcements table for communications
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create helper function to get user committee
CREATE OR REPLACE FUNCTION public.get_user_committee(user_id UUID)
RETURNS UUID AS $$
  SELECT committee_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for countries (readable by all authenticated users)
CREATE POLICY "Countries are viewable by authenticated users" ON public.countries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage countries" ON public.countries
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for committees
CREATE POLICY "Committees are viewable by authenticated users" ON public.committees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and secretaries can manage committees" ON public.committees
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general') OR
    (public.get_user_role(auth.uid()) = 'committee_secretary' AND id = public.get_user_committee(auth.uid()))
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for votes
CREATE POLICY "Users can view votes in their committee" ON public.votes
  FOR SELECT USING (
    committee_id = public.get_user_committee(auth.uid()) OR
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general')
  );

CREATE POLICY "Delegates can insert their own votes" ON public.votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    public.get_user_role(auth.uid()) = 'delegate' AND
    committee_id = public.get_user_committee(auth.uid())
  );

CREATE POLICY "Users can update their own votes" ON public.votes
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ratings
CREATE POLICY "Users can view ratings for their committee" ON public.ratings
  FOR SELECT USING (
    delegate_id = auth.uid() OR
    secretary_id = auth.uid() OR
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general')
  );

CREATE POLICY "Committee secretaries can create ratings" ON public.ratings
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'committee_secretary' AND
    secretary_id = auth.uid()
  );

-- RLS Policies for debate_log
CREATE POLICY "Users can view debate log for their committee" ON public.debate_log
  FOR SELECT USING (
    committee_id = public.get_user_committee(auth.uid()) OR
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general', 'committee_secretary')
  );

CREATE POLICY "Authorized users can create debate log entries" ON public.debate_log
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general', 'committee_secretary')
  );

-- RLS Policies for announcements
CREATE POLICY "All authenticated users can view announcements" ON public.announcements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Communications secretary can manage announcements" ON public.announcements
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('admin', 'secretary_general', 'communications_secretary') AND
    (author_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'secretary_general'))
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'delegate')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update triggers for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_committees_updated_at
  BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.countries (name, code) VALUES
  ('United States', 'US'),
  ('United Kingdom', 'UK'),
  ('Germany', 'DE'),
  ('France', 'FR'),
  ('Japan', 'JP'),
  ('Brazil', 'BR'),
  ('India', 'IN'),
  ('China', 'CN'),
  ('Russia', 'RU'),
  ('Mexico', 'MX');

INSERT INTO public.committees (name, topic) VALUES
  ('Security Council', 'International Peace and Security'),
  ('General Assembly', 'Sustainable Development Goals'),
  ('Economic and Social Council', 'Climate Change and Economic Development'),
  ('Human Rights Council', 'Protection of Minority Rights');

-- Enable realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.committees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;