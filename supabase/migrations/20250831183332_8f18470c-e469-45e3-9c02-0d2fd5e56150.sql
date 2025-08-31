-- Crear tabla para agenda de comités
CREATE TABLE public.agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_allocated INTEGER DEFAULT 1800, -- 30 minutos por defecto
  is_active BOOLEAN DEFAULT FALSE
);

-- Crear tabla para participaciones en agenda
CREATE TABLE public.agenda_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_item_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  committee_id UUID NOT NULL,
  participation_type TEXT NOT NULL DEFAULT 'speech', -- 'speech', 'motion', 'question'
  time_used INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para sesiones de votación avanzadas
CREATE TABLE public.voting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL,
  agenda_item_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  voting_type TEXT NOT NULL DEFAULT 'simple', -- 'simple', 'absolute_majority', 'qualified_majority'
  majority_threshold DECIMAL DEFAULT 0.5, -- 0.5 = 50%, 0.67 = 2/3
  allow_abstention BOOLEAN DEFAULT TRUE,
  allow_veto BOOLEAN DEFAULT FALSE,
  veto_members UUID[], -- Array de IDs de miembros con derecho a veto
  max_rounds INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Crear tabla para rondas de votación
CREATE TABLE public.voting_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voting_session_id UUID NOT NULL,
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result TEXT, -- 'approved', 'rejected', 'tied', 'vetoed'
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  vetoed_by UUID, -- ID del miembro que ejerció veto
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Modificar tabla votes para asociarla a sesiones de votación
ALTER TABLE public.votes 
ADD COLUMN voting_session_id UUID,
ADD COLUMN voting_round_id UUID,
ADD COLUMN agenda_item_id UUID;

-- Crear tabla para el orador del secretario
CREATE TABLE public.secretary_speaking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL,
  secretary_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices para mejorar performance
CREATE INDEX idx_agenda_items_committee_id ON public.agenda_items(committee_id);
CREATE INDEX idx_agenda_items_status ON public.agenda_items(status);
CREATE INDEX idx_agenda_participations_agenda_item_id ON public.agenda_participations(agenda_item_id);
CREATE INDEX idx_agenda_participations_delegate_id ON public.agenda_participations(delegate_id);
CREATE INDEX idx_voting_sessions_committee_id ON public.voting_sessions(committee_id);
CREATE INDEX idx_voting_sessions_agenda_item_id ON public.voting_sessions(agenda_item_id);
CREATE INDEX idx_voting_rounds_voting_session_id ON public.voting_rounds(voting_session_id);
CREATE INDEX idx_votes_voting_session_id ON public.votes(voting_session_id);
CREATE INDEX idx_secretary_speaking_committee_id ON public.secretary_speaking(committee_id);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_speaking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para agenda_items
CREATE POLICY "Users can view agenda items for their committee" 
ON public.agenda_items FOR SELECT 
USING (committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Allow public read access to agenda items" 
ON public.agenda_items FOR SELECT 
USING (true);

CREATE POLICY "Committee secretaries can manage agenda items" 
ON public.agenda_items FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid()))
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

-- Políticas RLS para agenda_participations
CREATE POLICY "Users can view agenda participations for their committee" 
ON public.agenda_participations FOR SELECT 
USING (committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Allow public read access to agenda participations" 
ON public.agenda_participations FOR SELECT 
USING (true);

CREATE POLICY "Committee secretaries can manage agenda participations" 
ON public.agenda_participations FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid()))
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

-- Políticas RLS para voting_sessions
CREATE POLICY "Users can view voting sessions for their committee" 
ON public.voting_sessions FOR SELECT 
USING (committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Allow public read access to voting sessions" 
ON public.voting_sessions FOR SELECT 
USING (true);

CREATE POLICY "Committee secretaries can manage voting sessions" 
ON public.voting_sessions FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid()))
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

-- Políticas RLS para voting_rounds
CREATE POLICY "Users can view voting rounds" 
ON public.voting_rounds FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.voting_sessions vs 
    WHERE vs.id = voting_session_id 
    AND (vs.committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]))
  )
);

CREATE POLICY "Allow public read access to voting rounds" 
ON public.voting_rounds FOR SELECT 
USING (true);

CREATE POLICY "Committee secretaries can manage voting rounds" 
ON public.voting_rounds FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.voting_sessions vs 
    WHERE vs.id = voting_session_id 
    AND (
      (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND vs.committee_id = get_user_committee(auth.uid()))
      OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])
    )
  )
);

-- Políticas RLS para secretary_speaking
CREATE POLICY "Users can view secretary speaking status for their committee" 
ON public.secretary_speaking FOR SELECT 
USING (committee_id = get_user_committee(auth.uid()) OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role]));

CREATE POLICY "Allow public read access to secretary speaking" 
ON public.secretary_speaking FOR SELECT 
USING (true);

CREATE POLICY "Committee secretaries can manage their speaking status" 
ON public.secretary_speaking FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid()) AND secretary_id = auth.uid())
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

-- Trigger para actualizar updated_at en agenda_items
CREATE TRIGGER update_agenda_items_updated_at
  BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para asegurar que solo un item de agenda esté activo por comité
CREATE OR REPLACE FUNCTION public.ensure_single_active_agenda_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está activando un item de agenda
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    -- Desactivar todos los otros items de agenda en el mismo comité
    UPDATE public.agenda_items 
    SET is_active = false 
    WHERE committee_id = NEW.committee_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_active_agenda_item
  BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_agenda_item();

-- Trigger para asegurar que solo un secretario esté hablando por comité
CREATE OR REPLACE FUNCTION public.ensure_single_secretary_speaking()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está activando el secretario
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    -- Desactivar todos los otros secretarios hablando en el mismo comité
    UPDATE public.secretary_speaking 
    SET is_active = false, ended_at = now()
    WHERE committee_id = NEW.committee_id AND id != NEW.id;
    
    -- Establecer started_at si es null
    IF NEW.started_at IS NULL THEN
      NEW.started_at = now();
    END IF;
  ELSIF NEW.is_active = false AND OLD.is_active = true THEN
    -- Si se está desactivando, establecer ended_at
    NEW.ended_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_secretary_speaking
  BEFORE UPDATE ON public.secretary_speaking
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_secretary_speaking();