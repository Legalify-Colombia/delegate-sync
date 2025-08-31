-- Habilitar Realtime completo para las tablas necesarias
-- 1) Asegurar REPLICA IDENTITY FULL para enviar filas completas en updates
ALTER TABLE public.committees REPLICA IDENTITY FULL;
ALTER TABLE public.speaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;

-- 2) Agregar tablas a la publicación supabase_realtime (o crearla si no existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.committees';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.speaking_queue';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.votes';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.committees, public.speaking_queue, public.votes;
  END IF;
END $$;