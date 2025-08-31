-- Arreglar funciones sin search_path establecido
CREATE OR REPLACE FUNCTION public.ensure_single_active_agenda_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.ensure_single_secretary_speaking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_committee_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Al pasar a activo desde otro estado: iniciar/reanudar sesión
    IF NEW.current_status = 'active'::committee_status AND (OLD.current_status IS DISTINCT FROM 'active'::committee_status) THEN
      NEW.session_started_at := now();

    -- Al pasar de activo a pausado o votación: acumular y limpiar inicio
    ELSIF (NEW.current_status IN ('paused'::committee_status, 'voting'::committee_status))
       AND (OLD.current_status = 'active'::committee_status) THEN
      IF OLD.session_started_at IS NOT NULL THEN
        NEW.session_accumulated_seconds := COALESCE(OLD.session_accumulated_seconds, 0)
          + GREATEST(0, EXTRACT(EPOCH FROM (now() - OLD.session_started_at))::INT);
      END IF;
      NEW.session_started_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_committee_timer_pause()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Si se borra la hora de fin (pausa), calcular remanente (permitiendo negativo)
    IF NEW.current_timer_end IS NULL AND OLD.current_timer_end IS NOT NULL THEN
      NEW.current_timer_remaining_seconds := (EXTRACT(EPOCH FROM (OLD.current_timer_end - now()))::INT);
    END IF;

    -- Si se establece manualmente un nuevo fin, limpiar remanente almacenado
    IF NEW.current_timer_end IS NOT NULL THEN
      NEW.current_timer_remaining_seconds := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;