-- Habilitar RLS para las nuevas tablas
ALTER TABLE public.agenda_items REPLICA IDENTITY FULL;
ALTER TABLE public.agenda_participations REPLICA IDENTITY FULL;
ALTER TABLE public.voting_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.voting_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.secretary_speaking REPLICA IDENTITY FULL;

-- Agregar a publicaciones de realtime
ALTER publication supabase_realtime ADD TABLE public.agenda_items;
ALTER publication supabase_realtime ADD TABLE public.agenda_participations;
ALTER publication supabase_realtime ADD TABLE public.voting_sessions;
ALTER publication supabase_realtime ADD TABLE public.voting_rounds;
ALTER publication supabase_realtime ADD TABLE public.secretary_speaking;

-- Crear triggers para las nuevas tablas
CREATE TRIGGER trigger_updated_at_agenda_items
  BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_single_active_agenda_item
  AFTER INSERT OR UPDATE ON public.agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_agenda_item();

CREATE TRIGGER trigger_single_secretary_speaking
  AFTER INSERT OR UPDATE ON public.secretary_speaking
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_secretary_speaking();

-- Crear función para registrar participaciones en agenda
CREATE OR REPLACE FUNCTION public.register_agenda_participation(
  p_agenda_item_id UUID,
  p_delegate_id UUID,
  p_committee_id UUID,
  p_participation_type TEXT DEFAULT 'speech',
  p_time_used INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participation_id UUID;
BEGIN
  INSERT INTO public.agenda_participations (
    agenda_item_id,
    delegate_id,
    committee_id,
    participation_type,
    time_used,
    started_at,
    ended_at
  ) VALUES (
    p_agenda_item_id,
    p_delegate_id,
    p_committee_id,
    p_participation_type,
    p_time_used,
    CASE WHEN p_time_used > 0 THEN NOW() - (p_time_used || ' seconds')::INTERVAL ELSE NOW() END,
    CASE WHEN p_time_used > 0 THEN NOW() ELSE NULL END
  )
  RETURNING id INTO participation_id;
  
  RETURN participation_id;
END;
$$;