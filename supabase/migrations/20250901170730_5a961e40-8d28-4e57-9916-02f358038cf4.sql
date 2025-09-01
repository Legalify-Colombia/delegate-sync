-- Agregar campos faltantes a la tabla amonestaciones
ALTER TABLE public.amonestaciones 
ADD COLUMN titulo TEXT NOT NULL DEFAULT '',
ADD COLUMN justificacion TEXT,
ADD COLUMN suspender_palabra BOOLEAN DEFAULT FALSE,
ADD COLUMN suspender_voto BOOLEAN DEFAULT FALSE,
ADD COLUMN activa BOOLEAN DEFAULT TRUE;

-- Renombrar columna motivo a descripcion para claridad
ALTER TABLE public.amonestaciones 
RENAME COLUMN motivo TO descripcion;

-- Crear tabla para rastrear suspensiones activas de delegados
CREATE TABLE public.delegate_suspensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delegate_id UUID NOT NULL,
  committee_id UUID NOT NULL,
  palabra_suspendida BOOLEAN DEFAULT FALSE,
  voto_suspendido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS en delegate_suspensions
ALTER TABLE public.delegate_suspensions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para delegate_suspensions
CREATE POLICY "Committee secretaries can manage delegate suspensions"
ON public.delegate_suspensions
FOR ALL
USING (
  (get_user_role(auth.uid()) = 'committee_secretary'::app_role AND committee_id = get_user_committee(auth.uid())) OR
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

CREATE POLICY "Users can view suspensions for their committee"
ON public.delegate_suspensions
FOR SELECT
USING (
  committee_id = get_user_committee(auth.uid()) OR
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'secretary_general'::app_role])
);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_delegate_suspensions_updated_at
BEFORE UPDATE ON public.delegate_suspensions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();