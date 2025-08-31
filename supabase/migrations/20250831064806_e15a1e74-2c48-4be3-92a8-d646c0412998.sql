-- Habilitar RLS en todas las tablas que no lo tienen
ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegate_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Mejorar las políticas de staff_requests para mejor visibilidad
DROP POLICY IF EXISTS "Staff can view and manage requests" ON public.staff_requests;
DROP POLICY IF EXISTS "Requesters can view their own requests" ON public.staff_requests;
DROP POLICY IF EXISTS "Secretaries can create staff requests" ON public.staff_requests;

-- Política para que staff y admins puedan ver todas las solicitudes
CREATE POLICY "Staff can view all requests" 
ON public.staff_requests 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role])
);

-- Política para que los solicitantes vean sus propias solicitudes
CREATE POLICY "Requesters can view own requests" 
ON public.staff_requests 
FOR SELECT 
USING (requester_id = auth.uid());

-- Política para que staff pueda actualizar solicitudes
CREATE POLICY "Staff can update requests" 
ON public.staff_requests 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['staff'::app_role, 'admin'::app_role, 'secretary_general'::app_role])
);

-- Política para que secretarios puedan crear solicitudes
CREATE POLICY "Secretaries can create requests" 
ON public.staff_requests 
FOR INSERT 
WITH CHECK (
  get_user_role(auth.uid()) = ANY (ARRAY['committee_secretary'::app_role, 'communications_secretary'::app_role, 'secretary_general'::app_role])
  AND requester_id = auth.uid()
);

-- Habilitar realtime para staff_requests
ALTER TABLE public.staff_requests REPLICA IDENTITY FULL;

-- Añadir tabla a la publicación de realtime si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'staff_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_requests;
    END IF;
END $$;