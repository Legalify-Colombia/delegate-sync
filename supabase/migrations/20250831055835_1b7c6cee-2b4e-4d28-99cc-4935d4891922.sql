-- 1) Nuevas columnas para control fiable de estado/tiempos del comité
ALTER TABLE public.committees
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_timer_remaining_seconds INTEGER;

-- 2) Trigger: acumular tiempo de sesión al pausar/entrar a votación y fijar inicio al activar
CREATE OR REPLACE FUNCTION public.handle_committee_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_committees_status_change ON public.committees;
CREATE TRIGGER trg_committees_status_change
BEFORE UPDATE OF current_status ON public.committees
FOR EACH ROW
EXECUTE FUNCTION public.handle_committee_status_change();

-- 3) Trigger: al pausar el temporizador del orador, guardar segundos restantes
CREATE OR REPLACE FUNCTION public.handle_committee_timer_pause()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Si se borra la hora de fin (pausa), calcular remanente
    IF NEW.current_timer_end IS NULL AND OLD.current_timer_end IS NOT NULL THEN
      NEW.current_timer_remaining_seconds := GREATEST(0, EXTRACT(EPOCH FROM (OLD.current_timer_end - now()))::INT);
    END IF;

    -- Si se establece manualmente un nuevo fin, limpiar remanente almacenado
    IF NEW.current_timer_end IS NOT NULL THEN
      NEW.current_timer_remaining_seconds := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_committees_timer_pause ON public.committees;
CREATE TRIGGER trg_committees_timer_pause
BEFORE UPDATE OF current_timer_end ON public.committees
FOR EACH ROW
EXECUTE FUNCTION public.handle_committee_timer_pause();