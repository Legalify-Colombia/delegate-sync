-- Ajuste: permitir segundos negativos al pausar el temporizador del comité
CREATE OR REPLACE FUNCTION public.handle_committee_timer_pause()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;